import httpStatus from 'http-status';
import _ from 'lodash';
import async from 'async';
import uuid from 'uuid';

// models
import { Invite, SurveyItem } from '../../../models';

// config
import config from '../../../../config/env';

/** GET /api/v2/survey-items/:id */
async function show(req, res, next) {
  try {
    // get company id from oauth req.user
    const company = req.user.company;

    const surveyItem = await SurveyItem.model
      .findOne({ company, _id: req.params.id }, '_id type required team company survey question')
      .populate({
        path: 'question',
        select: 'name translation linearScale.from LinearScale.to'
      })
      .lean();

    if (!surveyItem) return res.sendStatus(httpStatus.NOT_FOUND);

    return res.json(surveyItem);
  } catch (e) {
    /* istanbul ignore next */
    return next(e);
  }
}

/** POST /api/v2/survey-items/:id/generate-links - Generate links from data */
async function generateLinks(req, res, next) {
  try {
    const { id } = req.params;

    const { company } = req.user;

    const { invitations, ttl } = req.body;

    // find survey item and populate question items
    const surveyItem = await SurveyItem.model
      .findOne({ company, _id: id })
      .populate([{
        path: 'question',
        populate: [
          {
            path: 'questionItems',
            select: '_id'
          }
        ]
      }])
      .lean();

    if (!surveyItem) return res.sendStatus(httpStatus.NOT_FOUND);

    if (!surveyItem.question) {
      return res.status(httpStatus.BAD_REQUEST).send({
        error: 'Error: Survey item don\'t have a question'
      });
    }

    // supported types
    const validTypes = ['linearScale', 'thumbs', 'netPromoterScore', 'dropdown', 'multipleChoice', 'checkboxes'];

    if (!validTypes.includes(surveyItem.question.type)) {
      return res.status(httpStatus.BAD_REQUEST).send({
        error: 'Not supported question type'
      });
    }

    const result = await async.mapLimit(invitations, 5, (invitation, cb) => {
      _generateResult(invitation, ttl, surveyItem, company)
        .then((data, err) => cb(err, data))
        .catch(cb);
    });

    return res.json(result);
  } catch (e) {
    return next(e);
  }
}

async function _generateResult(invitation, ttl, surveyItem, company) {
  try {
    const { email, meta, ttl: inviteTtl } = invitation;

    const token = uuid();

    const invite = new Invite.model({
      token,
      company,
      meta,
      email,
      ttl: inviteTtl || ttl,
      survey: surveyItem.survey,
      team: surveyItem.team
    });

    // init data for supported types
    const range = _initDataLinks(surveyItem);

    // fill array of invite
    const links = range.map(i => `${config.hostname}/survey?token=${token}&surveyItem=${surveyItem._id.toString()}&${i}`);

    await invite.save();

    return { email, links };
  } catch (e) {
    return Promise.reject(e);
  }
}

function _initDataLinks (surveyItem) {
  const { type: questionType, questionItems } = surveyItem.question;

  switch (questionType) {
    // get question from - to range and generate end of link
    case 'linearScale':
      return _.range(
        1,
        surveyItem.question.linearScale.to + 1
      ).map(i => `value=${i}`);
    // get range of question yes or no and generate end of link
    case 'thumbs':
      return ['yes', 'no'].map(i => `value=${i}`);
    // get range of question NPS and generate end of link
    case 'netPromoterScore':
      return _.range(0, 11).map(i => `value=${i}`);
    // get range of questions with questionItems
    case 'dropdown':
    case 'multipleChoice':
    case 'checkboxes':
      return questionItems.map(i => i._id)
        .map(i => `value=${i}`);
    default:
      return {};
  }
}

export default { show, generateLinks };
