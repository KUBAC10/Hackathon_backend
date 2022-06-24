import httpStatus from 'http-status';
import uuid from 'uuid/v4';
import _ from 'lodash';
import { isEmail } from 'validator';

// models
import {
  Survey,
  Invite,
  Contact,
  TagEntity
} from '../../../models';

// config
import config from '../../../../config/env';

// services
import {
  ReportsListener,
  APIMessagesExtractor
} from '../../../services';

// helpers
import parseTpl from '../../../helpers/parse-es6-template';
import handleScopes from '../../helpers/handleScopes';

// mailers
import inviteSurveyMailer from '../../../mailers/inviteSurvey.mailer';

// POST /api/v1/invitation-contact - Invite contacts to survey
async function create(req, res, next) {
  const { survey, tagIds, lang: emailLang } = req.body;
  const { lang } = req.cookies;
  let { contactIds } = req.body;

  if (_.get(contactIds, 'length', 0) === 0 && _.get(tagIds, 'length', 0) === 0) {
    const error = await APIMessagesExtractor.getError(lang, 'invite.contactsOrTagsRequired');
    return res.status(400).send({ error });
  }

  try {
    let processedContacts = 0;
    // load survey
    const surveyDoc = await Survey.model
      .findById(survey)
      .populate('company', 'name')
      .lean();

    if (!surveyDoc) return res.sendStatus(httpStatus.NOT_FOUND);

    if (tagIds) contactIds = await _getUniqueContacts(tagIds, contactIds);

    // TODO: Research and refactoring process
    // process each contact
    for (const contactId of contactIds) {
      // TODO: process recurring surveys
      // check that given contact was invited on current survey
      const existingInvite = await Invite.model
        .findOne({ survey, contact: contactId })
        .lean();

      // send invite if it not present
      if (!existingInvite) {
        // generate token
        const token = uuid();

        // load contact
        const contact = await Contact.model.findById(contactId).lean();

        // TODO temporary log token, before move logic from Redis
        console.log(token);

        const invite = new Invite.model({ token, survey, contact });

        // assign current company/team scope
        handleScopes({ reqScopes: req.scopes, doc: invite });

        invite._req_user = { _id: req.user._id };

        await invite.save();

        processedContacts += 1;

        if (config.env === 'production') {
          /* istanbul ignore next */
          inviteSurveyMailer({
            token,
            lang: emailLang,
            survey: surveyDoc,
            name: contact.name,
            email: contact.email,
            _req_user: { _id: req.user._id }
          });
        }
      }
    }

    // TODO: Add message about already invited contacts
    let message;
    if (processedContacts === 0) {
      message = await APIMessagesExtractor.getMessage(lang, 'survey.noInvites');
    } else {
      const apiMessage = await APIMessagesExtractor.getMessage(lang, 'survey.successfullySent');
      message = parseTpl(apiMessage, { processedContacts }, '');
    }

    return res.status(httpStatus.OK).send({ message });
  } catch (e) {
    /* istanbul ignore next */
    return next(e);
  }
}

// POST /api/v1/invitation-contact/count - Get count of invites by contacts and tags
async function count(req, res, next) {
  const { tagIds, contactIds } = req.body;
  let contactsCount = 0;
  try {
    if (tagIds) {
      const uniqueContacts = await _getUniqueContacts(tagIds, contactIds);
      contactsCount = uniqueContacts.length;
    } else {
      contactsCount = contactIds.length;
    }

    return res.json(contactsCount);
  } catch (e) {
    /* istanbul ignore next */
    return next(e);
  }
}

// TODO move to another ctrl
/** POST /api/v1/invitation-contact/by-emails - Invite by emails */
async function byEmails(req, res, next) {
  const { emails, token, surveyId, type, lang: emailLang } = req.body;
  const { lang } = req.cookies;

  if (_.get(emails, 'length', 0) === 0) {
    const error = APIMessagesExtractor.getError(lang, 'invite.emailsRequired');
    return res.status(400).send({ error });
  }

  const survey = await Survey.model
    .findById(surveyId)
    .populate({
      path: 'company',
      select: 'name urlName'
    });

  if (!survey) return res.sendStatus(httpStatus.NOT_FOUND);

  let processedEmails = 0;

  try {
    for (const email of emails) {
      if (config.env === 'production' && isEmail(email)) {
        /* istanbul ignore next */
        inviteSurveyMailer({
          type,
          token,
          lang: emailLang,
          survey,
          email,
          _req_user: { _id: req.user._id }
        });
        processedEmails += 1;
      }
    }

    let message;
    if (processedEmails === 0) {
      message = await APIMessagesExtractor.getMessage(lang, 'survey.noInvites');
    } else {
      // process survey live data if new invites were created
      ReportsListener.liveData(survey);
      const apiMessage = await APIMessagesExtractor.getMessage(lang, 'survey.successfullySentToEmails');
      message = `${apiMessage}: ${processedEmails}`;
    }

    return res.status(httpStatus.OK).send({ message });
  } catch (e) {
    /* istanbul ignore next */
    return next(e);
  }
}

async function _getUniqueContacts(tagIds = [], contactIds = []) {
  const tagEntitiesByTags = await TagEntity.model
    .find({
      contact: { $exists: true },
      tag: { $in: tagIds }
    });
  const contactsByTags = tagEntitiesByTags.map(i => i.contact.toString());

  return tagIds && contactIds ? _.union(contactsByTags, contactIds) : contactsByTags;
}

export default { byEmails, create, count };
