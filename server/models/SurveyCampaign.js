import keystone from 'keystone';
import moment from 'moment';
import async from 'async';
import chalk from 'chalk';
import uuid from 'uuid';
import _ from 'lodash';

// helpers
import smsBuilder from '../helpers/smsBuilder';
import { checkLimit, handleLimit } from '../helpers/limitation';

// models
import {
  Mailer,
  Survey,
  Company,
  Invite,
  PulseSurveyRound,
  PulseSurveyRecipient,
  SurveySection,
  SurveyReport
} from '../models';

// config
import config from '../../config/env';

// mailer
import inviteSurveyMailer from '../mailers/inviteSurvey.mailer';
import invitesLimitationMailer from '../mailers/invitesLimitation.mailer';
import autoReportsMailer from '../mailers/autoReportsMailer.mailer';

const Types = keystone.Field.Types;

/**
 * SurveyCampaign Model
 * ==========
 */
const SurveyCampaign = new keystone.List('SurveyCampaign', {
  track: true,
  defaultSort: '-createdAt'
});

SurveyCampaign.add({
  name: {
    type: String,
    default: 'Survey Campaign'
  },
  type: {
    type: Types.Select,
    options: 'email, mobile, social',
    default: 'email'
  },
  socialType: {
    type: Types.Select,
    options: 'whatsApp'
  },
  status: {
    type: Types.Select,
    options: 'paused, active, finished',
    default: 'paused'
  },
  company: {
    type: Types.Relationship,
    ref: 'Company',
    initial: true,
    required: true
  },
  team: {
    type: Types.Relationship,
    ref: 'Team',
    initial: true,
    required: true
  },
  survey: {
    type: Types.Relationship,
    ref: 'Survey',
    initial: true,
    required: true
  },
  frequency: {
    type: Types.Select,
    options: 'once, everyDay, weekly, otherWeek, monthly, otherMonth, quarterly, 1hours, 4hours, 8hours',
    default() {
      return this.pulse ? 'weekly' : 'once';
    }
  },
  dontSendReport: {
    type: Boolean
  },
  duration: {
    type: Types.Select,
    options: 'auto, month, halfYear, year',
    default: 'auto'
  },
  questionPerSurvey: {
    type: Types.Number,
    default: 4
  },
  startDate: {
    type: Types.Date,
    utc: true,
    default: moment().utc().startOf('day').add(8, 'h'),
  },
  endDate: {
    type: Types.Date,
    utc: true,
    default: null
  },
  fireTime: {
    type: Types.Date,
    required: true,
    default() {
      return this.startDate;
    }
  },
  dayOfWeek: {
    type: Types.Select,
    options: 'monday, tuesday, wednesday, thursday, friday, saturday, sunday',
    default() {
      return _.lowerCase(moment(this.fireTime).format('dddd'));
    }
  },
  pulse: {
    type: Boolean
  },
  target: {
    type: Types.Relationship,
    ref: 'Target'
  },

  // Recipients
  tags: {
    type: Types.Relationship,
    ref: 'Tag',
    many: true
  },
  contacts: {
    type: Types.Relationship,
    ref: 'Contact',
    many: true
  },
  emails: {
    type: Types.TextArray
  },
  numbers: {
    type: Types.TextArray
  },

  // Reports Mailing
  reportsMailing: {
    type: Boolean
  },
  surveyReport: {
    type: Types.Relationship,
    ref: 'SurveyReport'
  },
  firstSending: {
    type: Boolean,
    default () {
      if (this.reportsMailing) return true;
    }
  },

  // Mailers
  invitationMailer: {
    type: Types.Relationship,
    ref: 'Mailer'
  },
  invitationMailerCustomText: {
    type: String
  },
  sendCompletionMailer: {
    type: Boolean
  },
  completionMailer: {
    type: Types.Relationship,
    ref: 'Mailer'
  },
  completionMailerCustomText: {
    type: String
  },
  sendReminderMailer: {
    type: Boolean
  },
  reminderMailer: {
    type: Types.Relationship,
    ref: 'Mailer'
  },
  reminderMailerCustomText: {
    type: String
  },
});

SurveyCampaign.schema.virtual('pulseSurveyRounds', {
  ref: 'PulseSurveyRound',
  localField: '_id',
  foreignField: 'surveyCampaign',
  options: {
    sort: { createdAt: 1 },
  }
});

SurveyCampaign.schema.add({ invitesData: { type: Object, default: [] } });

SurveyCampaign.schema.post('init', function () {
  const oldThis = this.toObject();

  this._oldFrequency = oldThis.frequency;
});

// check company limit
SurveyCampaign.schema.pre('save', async function (next) {
  try {
    if (this.isNew) await checkLimit(this);
  } catch (e) {
    return next(e);
  }
});

// update fireTime according to frequency
SurveyCampaign.schema.pre('save', async function (next) {
  try {
    if (this.isModified('frequency') && this._oldFrequency && this.frequency && this.fireTime && !this.reportMailing) {
      // rollback fireTime date to old frequency
      this.fireTime = moment(this.fireTime).subtract(..._getDelay(this._oldFrequency));
      // calc new fireTime date with new frequency
      this.fireTime = moment(this.fireTime).add(..._getDelay(this.frequency));
    }
  } catch (e) {
    return next(e);
  }
});

// set auto reports mailing fire time
SurveyCampaign.schema.pre('save', async function (next) {
  try {
    if (this.reportMailing && this.isModified('startDate')) {
      this.fireTime = this.startDate;
    }
  } catch (e) {
    return next(e);
  }
});

// create default mailers
SurveyCampaign.schema.pre('save', async function (next) {
  try {
    // skip if mailers exists or doc is updated
    if (
      !this.isNew
      || (this.invitationMailer && this.completionMailer)
      || this.pulse
      || this.reportsMailing
    ) return next();

    const { GlobalMailer, Mailer } = keystone.lists;
    const { _req_user, company } = this;

    // load global mailers
    const [
      invitationMailer,
      completeMailer
    ] = await Promise.all([
      GlobalMailer.model
        .findOne({
          release: true,
          name: 'Base Invitation',
          type: 'surveyInvitation'
        })
        .lean(),
      GlobalMailer.model
        .findOne({
          release: true,
          name: 'Base Complete',
          type: 'surveyComplete'
        })
        .lean(),
    ]);

    if (!invitationMailer || !completeMailer) return next();

    // create campaign mailers from global mailers
    const campaignInvitationMailer = new Mailer.model({
      company,
      fromGlobal: true,
      distribute: true,
      globalMailer: invitationMailer._id,
      ..._.pick(invitationMailer, ['type', 'subject', 'template', 'smsTemplate']),
      name: `${invitationMailer.name} ${Date.now()}` // because uniq index name + company
    });

    const campaignCompleteMailer = new Mailer.model({
      company,
      fromGlobal: true,
      distribute: true,
      globalMailer: completeMailer._id,
      ..._.pick(completeMailer, ['type', 'subject', 'template', 'smsTemplate']),
      name: `${completeMailer.name} ${Date.now()}` // because uniq index name + company
    });

    // set relations
    this.invitationMailer = campaignInvitationMailer._id;
    this.completionMailer = campaignCompleteMailer._id;

    // set user
    campaignInvitationMailer._req_user = _req_user;
    campaignCompleteMailer._req_user = _req_user;

    // save mailers
    await Promise.all([
      campaignInvitationMailer.save({ session: this.currentSession }),
      campaignCompleteMailer.save({ session: this.currentSession }),
    ]);

    next();
  } catch (e) {
    return next(e);
  }
});

// send sms
SurveyCampaign.schema.pre('save', async function (next) {
  try {
    const { isNew, type, status, numbers, invitationMailer, _req_user: user } = this;

    if (!isNew && type === 'mobile' && status === 'active') {
      const [
        mailer,
        survey,
        company
      ] = await Promise.all([
        Mailer.model
          .findOne({ _id: invitationMailer })
          .lean(),
        Survey.model
          .findOne({ _id: this.survey })
          .select('urlName')
          .lean(),
        Company.model
          .findOne({ _id: this.company })
          .select('urlName smsLimit')
      ]);

      if (company.smsLimit <= 0) return next();

      await async.eachLimit(numbers, 5, (to, cb) => {
        smsBuilder({
          mailer,
          to,
          user,
          company,
          data: { link: `${config.hostname}/${company.urlName}/${survey.urlName}` },
          type: 'sms',
          save: true,
          _req_user: user
        })
          .then(() => cb())
          .catch(cb);
      });

      this.status = 'paused';

      // decrement companySmsLimit
      company.smsLimit -= numbers.length;

      await company.save();
    }

    next();
  } catch (e) {
    return next(e);
  }
});

// load and save contacts data for invites
SurveyCampaign.schema.pre('save', async function (next) {
  try {
    const { isNew, type, status } = this;

    if (this.isModified('startDate')) this.fireTime = this.startDate;

    if (this.isModified('emails') || this.isModified('contacts') || this.isModified('tags')) {
      const { Contact, TagEntity, CompanyLimitation } = keystone.lists;

      // load contacts
      const [
        contacts,
        tagEntities,
        companyLimitation
      ] = await Promise.all([
        Contact.model
          .find({ _id: { $in: this.contacts } })
          .select('email name')
          .lean(),
        TagEntity.model
          .find({ tag: { $in: this.tags }, contact: { $exists: true } })
          .select('contact tag')
          .populate({ path: 'contact', select: 'email name' })
          .lean(),
        CompanyLimitation.model
          .findOne({ company: this.company })
          .lean()
      ]);

      // handle data
      // this.invitesData = _.uniqBy([
      //   ...contacts,
      //   ...tagEntities.map(t => ({ ...t.contact, tag: t.tag })),
      //   ...this.emails.map(email => ({ email }))
      // ], 'email');

      // group given data by email
      const emailsObject = _.groupBy([
        ...contacts,
        ...tagEntities.map(t => ({ ...t.contact, tag: t.tag })),
        ...this.emails.map(email => ({ email }))
      ], 'email');
      // => { 'qwe@qwe.qwe': [{ tag: 'tag1', contact: 'contact1' }, { tag: 'tag2' }]  };

      // accumulate data by email
      this.invitesData = Object.keys(emailsObject).reduce((acc, key) => {
        const items = emailsObject[key]; // get email related items
        const contact = items.find(i => !!i._id) || {}; // find related contact
        const tags = items // get all tags related to this email and campaign
          .filter(i => !!i.tag)
          .map(i => i.tag);

        return [
          ...acc,
          {
            ...contact,
            email: key,
            tags
          }
        ];
      }, []);

      this.markModified('invitesData');

      if (companyLimitation && companyLimitation.invites < this.invitesData.length) {
        return Promise.reject({
          name: 'CompanyLimitExceeded',
          message: `You only have ${companyLimitation.invites} monthly invitations available, but try to add ${this.invitesData.length} new`
        });
      }
    }

    if (!isNew && this.isModified('status') && type === 'email' && status === 'active' && !this.pulse && !this.reportsMailing) {
      if (this.frequency === 'once' && this.fireTime <= moment()) await this.send();
    }

    next();
  } catch (e) {
    return next(e);
  }
});

// PULSE
// create /remove new recipients records
SurveyCampaign.schema.pre('save', async function (next) {
  try {
    // skip for non-pulse / new / or not modified invitesData
    if (!this.pulse || this.isNew || !this.isModified('invitesData')) return next();

    // create/update new records
    for (const recRawData of this.invitesData) {
      const { email, _id: contact, tags } = recRawData;
      // reload PulseSurveyRecipient record
      let recipient = await PulseSurveyRecipient.model
        .findOne({
          email,
          surveyCampaign: this._id
        });
      if (recipient) {
        // update exist record data
        Object.assign(recipient, { ..._.omit(recRawData, '_id'), contact });
      } else {
        // create new record
        recipient = new PulseSurveyRecipient.model({
          email,
          contact,
          tags,
          surveyCampaign: this._id,
          survey: this.survey
        });
      }
      await recipient.save();
    }

    // TODO check if need to remove / soft remove / freez? to keep passed data in system
    // remove old records
    const recipientsToRemove = await PulseSurveyRecipient
      .model
      .find({
        surveyCampaign: this,
        email: { $nin: this.invitesData.map(i => i.email) }
      });

    for (const recToRemove of recipientsToRemove) {
      await recToRemove.remove();
    }

    next();
  } catch (e) {
    return next(e);
  }
});

// handle company limit
SurveyCampaign.schema.post('save', async function (next) {
  try {
    if (this._limit) await handleLimit(this._limit);
  } catch (e) {
    return next(e);
  }
});

// remove related mailers
SurveyCampaign.schema.pre('remove', async function (next) {
  try {
    await keystone.lists.Mailer.model.remove(
      { _id: { $in: [this.invitationMailer, this.completionMailer] } },
      { session: this.currentSession }
    );

    next();
  } catch (e) {
    return next(e);
  }
});

// create invites and send emails
SurveyCampaign.schema.methods.send = async function () {
  try {
    const { Survey, Mailer, CompanyLimitation } = keystone.lists;
    const { _id: surveyCampaign, invitesData = [], fireTime, frequency, pulse, target } = this;

    if (!invitesData.length || pulse) return;

    // load survey and invitation mailer
    const [
      survey,
      invitationMailer,
      companyLimitation,
      surveySections
    ] = await Promise.all([
      Survey.model
        .findOne({ _id: this.survey })
        .select('startDate endDate defaultLanguage name company')
        .populate({ path: 'company' })
        .lean(),
      Mailer.model
        .findOne({ _id: this.invitationMailer })
        .lean(),
      CompanyLimitation.model
        .findOne({ company: this.company })
        .populate('company')
        .lean(),
      SurveySection.model
        .find({
          survey: this.survey,
          hide: { $ne: true },
          inDraft: { $ne: true }
        })
        .sort('sortableId')
        .populate({
          path: 'surveyItems',
          match: {
            hide: { $ne: true },
            inDraft: { $ne: true },
            inTrash: { $ne: true }
          },
          populate: {
            path: 'question'
          }
        })
        .lean(),
    ]);

    const [surveyItem = {}] = surveySections
      .reduce((acc, { surveyItems = [] }) => [...acc, ...surveyItems], []);

    const { question } = surveyItem;

    if (companyLimitation) {
      if (companyLimitation.invites < this.invitesData.length) {
        this.status = 'paused';

        return;
      }

      if (companyLimitation.invites <= (this.invitesData.length * 2)) {
        await invitesLimitationMailer({
          company: companyLimitation.company,
          limit: companyLimitation.invites
        });
      }

      await CompanyLimitation.model.updateOne(
        { _id: companyLimitation._id },
        { $inc: { invites: 0 - this.invitesData.length } }
      );
    }

    // check ranges
    if ((this.startDate && this.startDate > fireTime)
      || (survey.startDate && survey.startDate > fireTime)) {
      return;
    }

    if ((this.endDate && this.endDate < fireTime)
      || (survey.endDate && survey.endDate < fireTime)) {
      this.status = 'finished';

      return;
    }

    // collect data from email invites
    const data = invitesData.map(i => ({
      ...i,
      survey,
      invitationMailer,
      surveyCampaign,
      surveyItem,
      question,
      target
    }));

    // create and send invites
    await async.eachLimit(data, 5, _handleInviteData);

    // set new fire time
    if (frequency !== 'once') {
      this.fireTime = moment(fireTime)
        .add(..._getDelay(frequency));
    }

    if ((this.endDate && this.endDate < this.fireTime)
      || (survey.endDate && survey.endDate < this.fireTime)
      || frequency === 'once') {
      this.status = 'finished';
    }
  } catch (e) {
    console.log(`Survey Campaign send invites error: ${e}`);
  }
};

// TODO tests
// create pulse survey rounds
SurveyCampaign.schema.methods.createRound = async function (options = {}) {
  try {
    const { _id: surveyCampaign, pulse, fireTime, frequency, invitesData, dayOfWeek } = this;

    if (!pulse || !invitesData.length) return;

    // check if campaign already have active round
    const activeRound = await PulseSurveyRound
      .model
      .findOne({
        surveyCampaign,
        status: 'active',
      })
      .lean();

    // skip creation if still have active round
    if (activeRound) return false;

    // TODO rewrite
    // check campaign fireTime
    const startDateX = parseInt(moment(fireTime).day(_.capitalize(dayOfWeek)).format('x'), 10);
    const momentX = parseInt(moment().format('x'), 10);
    if (startDateX > momentX) return false;

    const roundsCount = await PulseSurveyRound.model
      .find({ surveyCampaign })
      .countDocuments();

    const endDate = moment(fireTime).add(..._getDelay(frequency));
    // create pulse round
    const pulseRound = new PulseSurveyRound.model({
      sortableId: roundsCount + 1,
      endDate,
      surveyCampaign,
      dayOfWeek,
      startDate: fireTime,
      survey: this.survey,
      status: 'active'
    });

    await pulseRound.save(options);

    // set new fire date (date when new pulse survey round should be created)
    this.fireTime = endDate;
    await this.save(options);

    return pulseRound;
  } catch (e) {
    console.log(`Survey Campaign create rounds error: ${e}`);
  }
};

// send auto reports
SurveyCampaign.schema.methods.sendReport = async function () {
  try {
    const { fireTime, frequency, invitesData, firstSending, dontSendReport } = this;

    const report = await SurveyReport.model.findById(this.surveyReport);

    if (!report) return;

    // get report range
    let from;
    let to;

    if (frequency !== 'once' && !firstSending) {
      from = moment(fireTime).subtract(..._getDelay(frequency));
      to = fireTime;
    }

    // load report data and  handle data (table/csv/pdf)
    const { filters, attachments } = await report.getAutoReportData({ from, to });

    if (filters === 'No new results have been received in the specified period of time.' && dontSendReport) return;

    const reportName = report.name;
    const reportDate = moment(fireTime).format('DD/MM/YYYY HH:mm:ss');

    // set new fireTime and lastFire time
    this.fireTime = moment(fireTime).add(..._getDelay(this.frequency));

    if (frequency === 'once') this.status = 'finished';

    if (this.endDate) {
      const endDateX = moment(this.endDate).format('x');
      const fireTimeX = moment(this.fireTime).format('x');

      if (endDateX > fireTimeX) this.status = 'finished';
    }

    this.firstSending = false;

    await this.save();

    // send emails
    await autoReportsMailer({
      filters,
      attachments,
      reportName,
      reportDate,
      invitesData
    });
  } catch (e) {
    console.log(`Survey Campaign send report error: ${e}`);
  }
};

async function _handleInviteData(data, cb) {
  try {
    const token = uuid();
    const {
      _id: contact,
      tags,
      survey,
      email,
      invitationMailer,
      name,
      surveyCampaign,
      surveyItem,
      question,
      target
    } = data;

    // create invite
    const invite = new Invite.model({
      email,
      contact,
      survey,
      token,
      surveyCampaign,
      target,
      tags
    });

    // save invite
    await invite.save();

    if (config.env === 'production') {
      //* istanbul ignore next */
      inviteSurveyMailer({
        token,
        surveyItem,
        question,
        invitationMailer: { ...invitationMailer },
        survey,
        name,
        email
      });
    }

    cb();
  } catch (e) {
    console.error(chalk.red(`_handleInviteData error: ${e}`));

    cb();
  }
}

function _getDelay(frequency) {
  switch (frequency) {
    case '1hours':
      return [1, 'hours'];
    case '4hours':
      return [4, 'hours'];
    case '8hours':
      return [8, 'hours'];
    case 'weekly':
      return [1, 'week'];
    case 'everyDay':
      return [1, 'day'];
    case 'otherWeek':
      return [2, 'week'];
    case 'monthly':
      return [1, 'month'];
    case 'otherMonth':
      return [2, 'month'];
    case 'quarterly':
      return [3, 'month'];
    default:
      return [0, 'second'];
  }
}

/**
 * Registration
 */
SurveyCampaign.defaultColumns = 'type company createdAt';
SurveyCampaign.register();

export default SurveyCampaign;
