import httpStatus from 'http-status';
import { promises as fs } from 'fs';
import uuid from 'uuid';
import _ from 'lodash';
import { isFloat, isMobilePhone } from 'validator';

// models
import {
  Survey,
  CompanyLimitation,
  SurveyCampaign,
  Contact,
  Tag,
  Mailer,
  SurveyItem,
  User,
  PulseSurveyRound,
  SurveyResult,
  PulseSurveyRecipient,
  PulseSurveyRoundResult
} from '../../../models';

// helpers
import { handleScopes, hasAccess } from '../../helpers';
import { initSession } from '../../../helpers/transactions';
import parseTpl from '../../../helpers/parse-es6-template';
import pulseMailerQuestionTemplateBuilder from '../../../helpers/pulseMailerQuestionTemplateBuilder';
import { getPassTime } from '../../../mailers/pulseRoundMailer';

// config
import config from '../../../../config/env';

// GET /api/v1/distribute/recipients/:id - find recipients by tag or name
async function findRecipients(req, res, next) {
  try {
    const { value } = req.query;
    const { id } = req.params;

    const campaign = await SurveyCampaign.model
      .findOne({ _id: id })
      .select('tags contacts company team')
      .lean();

    if (!campaign) return res.sendStatus(httpStatus.NOT_FOUND);

    if (!hasAccess(campaign, req.scopes)) {
      return res.sendStatus(httpStatus.FORBIDDEN);
    }

    // find tags
    if (value.includes('#')) {
      const query = {
        _id: { $nin: campaign.tags },
        $or: [
          { name: { $regex: value.replace(/#/gi, ''), $options: 'i' } },
          { description: { $regex: value.replace(/#/gi, ''), $options: 'i' } }
        ]
      };

      handleScopes({ reqScopes: req.scopes, query });

      const tags = await Tag.model
        .find(query)
        .select('name members color')
        .populate('members')
        .sort('createdAt')
        .limit(10)
        .lean();

      return res.send(tags);
    }

    // find contacts by mobile number
    if (_.startsWith(value, '+') || isFloat(value) || isMobilePhone(value)) {
      const query = {
        _id: { $nin: campaign.contacts },
        phoneNumber: { $regex: value.replace(/\+/gi, ''), $exists: true }
      };

      handleScopes({ reqScopes: req.scopes, query });

      const contacts = await Contact.model
        .find(query)
        .select('name phoneNumber')
        .sort('createdAt')
        .limit(5)
        .lean();

      return res.send(contacts);
    }

    const contactQuery = {
      _id: { $nin: campaign.contacts },
      $or: [
        { 'name.first': { $regex: value, $options: 'i' } },
        { 'name.last': { $regex: value, $options: 'i' } },
        { email: { $regex: value, $options: 'i' } }
      ]
    };
    const tagQuery = {
      _id: { $nin: campaign.tags },
      $or: [
        { name: { $regex: value, $options: 'i' } },
        { description: { $regex: value, $options: 'i' } },
      ]
    };

    handleScopes({ reqScopes: req.scopes, query: contactQuery });
    handleScopes({ reqScopes: req.scopes, query: tagQuery });

    const [
      contacts,
      tags
    ] = await Promise.all([
      Contact.model
        .find(contactQuery)
        .select('name email')
        .sort('createdAt')
        .limit(5)
        .lean(),
      Tag.model
        .find(tagQuery)
        .select('name members color')
        .populate('members')
        .sort('createdAt')
        .limit(5)
        .lean()
    ]);

    return res.send([...contacts, ...tags]);
  } catch (e) {
    /* istanbul ignore next */
    return next(e);
  }
}

// PUT /api/v1/distribute/recipients/:id - edit survey campaign recipient
async function editRecipients(req, res, next) {
  const session = await initSession();
  try {
    const { action, entities, value } = req.body;
    const handler = { add: _.concat, remove: _.without }[action];
    const query = { _id: req.params.id };

    handleScopes({ reqScopes: req.scopes, query });

    const campaign = await SurveyCampaign.model.findOne(query);

    campaign[entities] = _.uniq(handler(campaign[entities].map(i => i.toString()), value));

    await session.withTransaction(async () => await campaign.save({ session }));

    const reloadCampaign = await SurveyCampaign.model
      .findOne(query)
      .populate({ path: 'tags', select: 'name color' })
      .populate({ path: 'contacts', select: 'name email' })
      .lean();

    return res.send(reloadCampaign);
  } catch (e) {
    /* istanbul ignore next */
    return next(e);
  }
}

// GET /api/v1/distribute/tag/:id - show tag emails
async function showTag(req, res, next) {
  try {
    const { id } = req.params;
    const query = { _id: id };

    const tag = await Tag.model
      .findOne(query)
      .populate({
        path: 'tagEntities',
        select: 'contact',
        match: {
          contact: { $exists: true }
        },
        populate: {
          path: 'contact',
          select: 'name email'
        }
      })
      .lean();

    if (!tag) return res.sendStatus(httpStatus.NOT_FOUND);

    if (!hasAccess(tag, req.scopes)) return res.sendStatus(httpStatus.FORBIDDEN);

    tag.tagEntities = _.get(tag, 'tagEntities', []).filter(e => !!e.contact);

    return res.send(tag);
  } catch (e) {
    /* istanbul ignore next */
    return next(e);
  }
}

// POST /api/v1/distribute/:id - create survey campaign from existed
async function createFromCopy(req, res, next) {
  const session = await initSession();
  try {
    const user = req.user;
    const query = { _id: req.params.id };

    if (user.isLite) await _checkCompanyLimit(user.companyId);

    const original = await SurveyCampaign.model
      .findOne(query)
      .select({
        _id: 0,
        name: 1,
        type: 1,
        company: 1,
        team: 1,
        survey: 1,
        tags: 1,
        contacts: 1,
        emails: 1,
        invitationMailer: 1,
        completionMailer: 1,
        sendCompletionMailer: 1,
        frequency: 1,
        startDate: 1,
        endDate: 1,
        target: 1
      })
      .populate([
        {
          path: 'invitationMailer',
          select: '-_id name type company subject template smsTemplate'
        },
        {
          path: 'completionMailer',
          select: '-_id name type company subject template smsTemplate'
        },
      ])
      .lean();

    if (!original) return res.sendStatus(httpStatus.NOT_FOUND);

    if (!hasAccess(original, req.scopes)) return res.sendStatus(httpStatus.FORBIDDEN);

    // clone mailers
    const [
      invitationMailer,
      completionMailer
    ] = [
      original.invitationMailer,
      original.completionMailer,
    ]
      .map(mailer => new Mailer.model({
        ...mailer,
        distribute: true,
        name: `${_.get(mailer, 'name', '')} ${Date.now()}` // because uniq index name + company
      }));

    // create survey campaign
    const campaign = new SurveyCampaign.model({
      ...original,
      invitationMailer,
      completionMailer
    });

    // set user
    invitationMailer._req_user = user;
    completionMailer._req_user = user;
    campaign._req_user = user;

    await session.withTransaction(async () => {
      // save mailers
      await Promise.all([
        invitationMailer.save({ session }),
        completionMailer.save({ session }),
      ]);

      // save survey campaign
      await campaign.save({ session });
    });

    const reloadCampaign = await SurveyCampaign.model
      .findOne({ _id: campaign._id })
      .populate([
        {
          path: 'tags',
          select: 'name color'
        },
        {
          path: 'contacts',
          select: 'name email'
        },
        {
          path: 'invitationMailer'
        },
        {
          path: 'completionMailer'
        },
      ])
      .lean();

    return res.status(httpStatus.CREATED).send(reloadCampaign);
  } catch (e) {
    /* istanbul ignore next */
    return next(e);
  }
}

// POST /api/v1/distribute - create survey campaign
async function create(req, res, next) {
  try {
    const { survey, type, target } = req.body;
    const { companyId: company, currentTeam: team, isLite } = req.user;
    const query = { _id: survey, inTrash: { $ne: true } };

    if (isLite) await _checkCompanyLimit(company);

    handleScopes({ reqScopes: req.scopes, query });

    const surveyDoc = await Survey.model
      .findOne(query)
      .lean();

    if (!surveyDoc) return res.sendStatus(httpStatus.NOT_FOUND);

    const surveyCampaign = new SurveyCampaign.model({
      target,
      team,
      company,
      survey,
      type
    });

    surveyCampaign._req_user = req.user;

    await surveyCampaign.save();

    const reload = await SurveyCampaign.model
      .findOne({ _id: surveyCampaign._id })
      .populate([
        {
          path: 'invitationMailer'
        },
        {
          path: 'completionMailer'
        },
      ])
      .lean();

    return res.status(httpStatus.CREATED).send(reload);
  } catch (e) {
    /* istanbul ignore next */
    return next(e);
  }
}

// GET /api/v1/distribute - get list of survey campaigns
async function list(req, res, next) {
  try {
    const { skip = 0, limit = 10, sort = 'createdAt', survey } = req.query;
    const query = { survey, target: { $exists: false }, reportsMailing: { $ne: true } };

    handleScopes({ reqScopes: req.scopes, query });

    const [
      resources,
      total,
      active
    ] = await Promise.all([
      SurveyCampaign.model
        .find(query)
        .populate([
          {
            path: 'tags',
            select: 'name color'
          },
          {
            path: 'contacts',
            select: 'name email'
          }
        ])
        .skip(skip)
        .limit(limit)
        .sort(sort)
        .lean(),
      SurveyCampaign.model
        .find(query)
        .countDocuments(),
      SurveyCampaign.model // number of active distributes
        .find({
          ...query,
          target: { $exists: false },
          status: 'active'
        })
        .countDocuments()
    ]);

    return res.send({ resources, total, active });
  } catch (e) {
    /* istanbul ignore next */
    return next(e);
  }
}

// GET /api/v1/distribute/:id - show survey campaign
async function show(req, res, next) {
  try {
    const query = { _id: req.params.id };

    handleScopes({ reqScopes: req.scopes, query });

    const campaign = await SurveyCampaign.model
      .findOne(query)
      .populate([
        {
          path: 'tags',
          select: 'name color'
        },
        {
          path: 'contacts',
          select: 'name email'
        },
        {
          path: 'invitationMailer'
        },
        {
          path: 'completionMailer'
        }
      ])
      .lean();

    if (!campaign) return res.sendStatus(httpStatus.NOT_FOUND);

    return res.send(campaign);
  } catch (e) {
    /* istanbul ignore next */
    return next(e);
  }
}

// GET /api/v1/distribute/:id/mailer-preview
async function mailerPreview(req, res, next) {
  try {
    const { id } = req.params;
    const { type } = req.query;

    const query = { _id: id };

    handleScopes({ reqScopes: req.scopes, query });

    const campaign = await SurveyCampaign.model
      .findOne(query)
      .populate('survey')
      .lean();

    if (!campaign) return res.sendStatus(httpStatus.NOT_FOUND);

    const [
      mailer,
      surveyItem,
      user
    ] = await Promise.all([
      Mailer.model
        .findOne({
          company: campaign.company,
          type
        })
        .lean(),
      SurveyItem.model
        .findOne({ survey: campaign.survey })
        .populate([
          {
            path: 'question',
            select: 'type name linearScale description'
          },
          {
            path: 'company',
            select: 'name'
          }
        ])
        .lean(),
      User.model
        .findOne({ _id: req.user._id })
        .select('name')
        .lean()
    ]);

    if (!mailer) return res.sendStatus(httpStatus.NOT_FOUND);

    const { company, question } = surveyItem;

    const data = {
      hostname: config.hostname,
      username: user.name.firstName,
      companyName: company.name,
      token: uuid(),
      numberOfQuestions: campaign.questionPerSurvey,
      passTime: getPassTime(campaign.questionPerSurvey)
    };

    const customerText = {
      pulseCompleted: campaign.completionMailerCustomText,
      pulseFirstInvitation: campaign.invitationMailerCustomText,
      pulseSecondInvitation: campaign.invitationMailerCustomText,
      pulseReminder: campaign.reminderMailerCustomText,
      reminderAfterFirstInvitation: campaign.reminderMailerCustomText,
      reminderAfterSecondInvitation: campaign.reminderMailerCustomText,
      pulseReminderWithQuestion: campaign.reminderMailerCustomText
    }[type];

    if (['linearScale', 'netPromoterScore'].includes(question.type)) {
      await pulseMailerQuestionTemplateBuilder({
        question,
        surveyItem,
        data,
        survey: campaign.survey,
        roundResult: { token: uuid() },
      });
    }

    if (customerText) {
      const buffer = await fs.readFile('server/mailers/pulseMailers/customerTextBlock.html');

      data.customerTextBlock = parseTpl(buffer.toString(), { customerText }, '');
    }

    mailer.template = parseTpl(mailer.template, data, '');

    return res.send(mailer);
  } catch (e) {
    return next(e);
  }
}

// PUT /api/v1/distribute/:id - update survey campaign
async function update(req, res, next) {
  const session = await initSession();
  try {
    const query = { _id: req.params.id };

    handleScopes({ reqScopes: req.scopes, query });

    const campaign = await SurveyCampaign.model
      .findOne(query)
      .populate('companyLimitation');

    if (!campaign) return res.sendStatus(httpStatus.NOT_FOUND);

    if (campaign.pulse && req.body.frequency === 'once') delete req.body.frequency;

    Object.assign(campaign, req.body);

    campaign._req_user = req.user;

    await session.withTransaction(async () => await campaign.save({ session }));

    const reloadCampaign = await SurveyCampaign.model
      .findOne(query)
      .populate('tags')
      .populate('contacts')
      .lean();

    return res.send(reloadCampaign);
  } catch (e) {
    /* istanbul ignore next */
    return next(e);
  }
}

// DELETE /api/v1/distribute/:id - remove survey campaign
async function destroy(req, res, next) {
  const session = await initSession();
  try {
    const query = { _id: req.params.id };

    handleScopes({ reqScopes: req.scopes, query });

    const campaign = await SurveyCampaign.model.findOne(query);

    if (!campaign) return res.sendStatus(httpStatus.NOT_FOUND);

    await session.withTransaction(async () => await campaign.remove({ session }));

    return res.sendStatus(httpStatus.NO_CONTENT);
  } catch (e) {
    /* istanbul ignore next */
    return next(e);
  }
}

// PUT /api/v1/distribute/:id/rounds/:roundId - update round
async function updateRound(req, res, next) {
  const session = await initSession();
  try {
    const { id, roundId } = req.params;

    const query = { _id: id };

    handleScopes({ reqScopes: req.scopes, query });

    const campaign = await SurveyCampaign.model
      .findOne(query)
      .lean();

    if (!campaign) return res.sendStatus(httpStatus.NOT_FOUND);

    const pulseSurveyRound = await PulseSurveyRound.model
      .findOne({
        _id: roundId,
        surveyCampaign: campaign._id
      });

    if (!pulseSurveyRound) return res.sendStatus(httpStatus.NOT_FOUND);

    _.merge(pulseSurveyRound, req.body);

    await session.withTransaction(async () => {
      await pulseSurveyRound.save({ session });
    });

    const reload = await PulseSurveyRound.model
      .findOne({ _id: pulseSurveyRound._id })
      .populate('employees')
      .lean();

    return res.send(reload);
  } catch (e) {
    return next(e);
  }
}

// GET /api/v1/distribute/:id/rounds - get list of rounds
async function roundsList(req, res, next) {
  try {
    const { id } = req.params;

    const query = { _id: id };

    handleScopes({ reqScopes: req.scopes, query });

    const campaign = await SurveyCampaign.model
      .findOne(query)
      .lean();

    if (!campaign) return res.sendStatus(httpStatus.NOT_FOUND);

    const rounds = await PulseSurveyRound.model
      .find({ surveyCampaign: campaign._id })
      .populate('employees')
      .sort({ createdAt: -1 })
      .lean();

    for (const round of rounds) {
      const [
        completed,
        recipients
      ] = await Promise.all([
        SurveyResult.model
          .find({
            pulseSurveyRound: round._id,
            completed: true
          })
          .countDocuments(),
        PulseSurveyRoundResult.model
          .find({
            pulseSurveyRound: round._id
          })
          .countDocuments()
      ]);

      round.responseRate = (((completed / recipients) || 0) * 100).toPrecision(3);
    }

    return res.send(rounds);
  } catch (e) {
    return next(e);
  }
}

// TODO test
// POST /api/v1/distribute/:id/rounds/:roundId/send-reminders - send reminders to all recipients
async function sendReminders(req, res, next) {
  try {
    const { id, roundId } = req.params;

    const query = { _id: id };

    handleScopes({ reqScopes: req.scopes, query });

    const [
      campaign,
      round
    ] = await Promise.all([
      SurveyCampaign.model
        .findOne(query)
        .lean(),
      PulseSurveyRound.model
        .findOne({
          _id: roundId,
          surveyCampaign: id
        })
    ]);

    if (!campaign || !round) return res.sendStatus(httpStatus.NOT_FOUND);

    // TODO move to cron
    await round.sendReminders({ participation: true });

    return res.sendStatus(httpStatus.OK);
  } catch (e) {
    return next(e);
  }
}

// GET /api/v1/distribute/unsubscribe/:token - unsubscribe user onto distribute
async function unsubscribe(req, res, next) {
  const session = await initSession();
  try {
    const { token } = req.params;

    const result = await PulseSurveyRoundResult.model
      .findOne({ token })
      .select('recipient')
      .lean();

    if (!result || !result.recipient) return res.sendStatus(httpStatus.NOT_FOUND);

    const recipient = await PulseSurveyRecipient.model
      .findOne({
        _id: result.recipient,
        unsubscribe: { $ne: true }
      });

    if (!recipient) return res.sendStatus(httpStatus.NOT_FOUND);

    // set unsubscribe option
    recipient.unsubscribe = true;

    await session.withTransaction(async () => await recipient.save({ session }));

    return res.sendStatus(httpStatus.OK);
  } catch (e) {
    return next(e);
  }
}

// don't allow creating new campaign if no invitations left
async function _checkCompanyLimit(company) {
  try {
    const limitation = await CompanyLimitation.model
      .findOne({ company })
      .lean();

    if (!limitation) return false;

    if (limitation.invites > 0) return false;

    return Promise.reject({
      name: 'CompanyLimitExceeded',
      message: 'You can\'t create new campaign, because exceed monthly limit of invitations'
    });
  } catch (e) {
    /* istanbul ignore next */
    Promise.reject(e);
  }
}

export default {
  findRecipients,
  editRecipients,
  showTag,
  createFromCopy,
  create,
  list,
  show,
  mailerPreview,
  update,
  destroy,
  updateRound,
  roundsList,
  sendReminders,
  unsubscribe
};
