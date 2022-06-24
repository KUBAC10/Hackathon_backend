// base
import _ from 'lodash';
import { promises as fs } from 'fs';
import httpStatus from 'http-status';
import uuid from 'uuid';

// config
import config from '../../../../config/env';

// models
import { Invite, Survey, Target } from '../../../models';

// helpers
import parseTpl from '../../../helpers/parse-es6-template';
import { initSession } from '../../../helpers/transactions';

/** GET /api/v2/surveys/:id */
async function show(req, res, next) {
  try {
    // get company id from oauth req.user
    const company = req.user.company;

    const survey = await Survey.model
      .findOne({ _id: req.params.id, company })
      .populate([
        {
          path: 'surveySection',
          select: 'survey name description ',
          options: { sort: { sortableId: 1 } },
          populate: [
            {
              path: 'surveyItems',
              select: 'survey surveySection type question required html image',
              populate: [
                {
                  path: 'question',
                  select: 'type translation linearScale.from linearScale.to name description',
                }
              ]
            }
          ]
        },
        {
          path: 'company',
          select: 'logo colors'
        }
      ])
      .select('urlName translation name description startDate endDate createdAt updatedAt')
      .lean();

    if (!survey) return res.sendStatus(httpStatus.NOT_FOUND);

    return res.json(survey);
  } catch (e) {
    /* istanbul ignore next */
    return next(e);
  }
}

/** GET /api/v2/surveys - Get list of survey in company scope */
async function list(req, res, next) {
  try {
    const { skip, limit, sort } = req.query;
    // get company id from oauth req.user
    const company = req.user.company;

    const [resources, total] = await Promise.all([
      await Survey.model
        .find({ company })
        .select('name description urlName translation startDate endDate createdAt updatedAt')
        .sort(sort || { createdAt: -1 })
        .skip(parseInt(skip, 10))
        .limit(parseInt(limit, 10))
        .lean(),

      Survey.model.find({ company })
        .lean()
        .countDocuments()
    ]);

    return res.json({ resources, total });
  } catch (e) {
    /* istanbul ignore next */
    return next(e);
  }
}

// TODO tests
/** POST /api/v2/surveys/:id/first-question-html - Get first question of survey in html */
async function firstQuestionHtml(req, res, next) {
  try {
    const session = await initSession();

    const { id: surveyId } = req.params;
    const { lang, ttl, targetId, meta = {} } = req.query;
    // get company id from oauth req.user
    const company = req.user.company || req.user.companyId;

    // load survey and presence of question
    const survey = await Survey
      .model
      .findOne({ company, _id: surveyId })
      .populate({
        path: 'surveySections',
        populate: {
          path: 'surveyItems',
          populate: {
            path: 'question'
          }
        }
      })
      .lean();

    if (!survey) return res.sendStatus(httpStatus.NOT_FOUND);

    const { surveySections = [] } = survey;

    if (!surveySections.length) return res.sendStatus(httpStatus.NOT_FOUND);

    // get first surveyItem and check if that is question
    const surveyItems = surveySections
      .reduce((acc, { surveyItems = [] }) => ([
        ...acc,
        ...surveyItems
      ]), []);

    if (!surveyItems.length) {
      return res.status(httpStatus.BAD_REQUEST)
        .send({ message: 'Survey dont have first question or first item is not question' });
    }

    const [surveyItem] = surveyItems;
    const { question } = surveyItem;

    // prep base data
    const data = { hostname: config.hostname };

    // check if target is present
    let target;
    if (targetId) {
      target = await Target.model
        .findOne({ survey: surveyId, _id: targetId })
        .populate('company')
        .lean();
    }

    await session.withTransaction(async () => {
      // check if query lang is present, or set default
      const surveyLang = survey.translation[lang] ? lang : survey.defaultLanguage;

      // generate invitation
      const invResult = await _generateResult({
        surveyItem,
        company,
        session,
        target,
        lang: surveyLang,
        invitation: { meta, ttl }
      });

      // load base template
      const baseTemplate = await fs.readFile('server/mailers/firstQuestionHtml/index.html', 'utf8');

      // build questionContent
      const questionContentTemplate = await fs.readFile('server/mailers/firstQuestionHtml/questionContent.html', 'utf8');

      const questionName = _.get(question, `name.${surveyLang}`);
      const questionDescription = _.get(question, `description.${surveyLang}`);

      data.questionContent = parseTpl(questionContentTemplate, { questionName, questionDescription }, '');

      // build questionLinksContent
      data.questionLinksContent = await questionLinksTemplateBuilder({
        question,
        invResult,
        target,
        lang: surveyLang
      });

      const response = parseTpl(baseTemplate, data, '');

      return res.send(response);
    });
  } catch (e) {
    /* istanbul ignore next */
    return next(e);
  }
}

function _initDataLinks(surveyItem) {
  switch (_.get(surveyItem, 'question.type')) {
    // get question from - to range and generate end of link
    case 'linearScale':
      return _.range(
        1,
        surveyItem.question.linearScale.to + 1
      )
        .map(i => `value=${i}`);
    // get range of question yes or no and generate end of link
    // case 'thumbs':
    //   return ['yes', 'no'].map(i => `value=${i}`);
    // // get range of question NPS and generate end of link
    case 'netPromoterScore':
      return _.range(0, 11)
        .map(i => `value=${i}`);
    // // get range of questions with questionItems
    // case 'dropdown':
    // case 'multipleChoice':
    // case 'checkboxes':
    //   return questionItems.map(i => i._id)
    //     .map(i => `value=${i}`);
    default:
      return [];
  }
}

async function _generateResult({ invitation, target, surveyItem, company, lang, session }) {
  try {
    const { meta, ttl } = invitation;
    let links;

    // init data for supported types
    const range = _initDataLinks(surveyItem);

    // if target is present build links for target public survey, without invitations
    if (target) {
      links = range.map(i => `${config.hostname}/${target.company.urlName}/target/${target.token}?surveyItem=${surveyItem._id.toString()}&${i}&lang=${lang}`);

      return { links };
    }

    // generate invite data
    const token = uuid();
    const invite = new Invite.model({
      token,
      company,
      meta,
      ttl,
      survey: surveyItem.survey,
      team: surveyItem.team
    });

    // fill array of invite
    links = range.map(i => `${config.hostname}/survey?token=${token}&surveyItem=${surveyItem._id.toString()}&${i}&lang=${lang}`);

    await invite.save({ session });

    return { invite, links };
  } catch (e) {
    return Promise.reject(e);
  }
}

export async function questionLinksTemplateBuilder({ question, invResult, target, lang }) {
  try {
    switch (_.get(question, 'type')) {
      case 'linearScale': {
        const data = {};
        // load linearScale template
        const optionsTemplate = await fs.readFile('server/mailers/firstQuestionHtml/optionsContent.html', 'utf8');
        // get icon
        const icon = _.get(question, 'linearScale.icon', 'star');
        const fromCaption = _.get(question, `linearScale.fromCaption.${lang}`);
        const toCaption = _.get(question, `linearScale.toCaption.${lang}`);

        const iconSize = invResult.links.length <= 5 ? '72px' : '50px';
        // parse options
        const optionsContent = invResult.links.reduce((acc, link, index) => {
          // build icon image source
          let iconImg = icon;
          if (icon === 'smiley') {
            // for smiley check options amount
            if (invResult.links.length === 5) {
              iconImg = `smiley_${index + 1}`;
            } else if (invResult.links.length === 3) {
              if (index === 0) iconImg = `smiley_${index + 1}`;
              if (index === 1) iconImg = `smiley_${index + 2}`;
              if (index === 2) iconImg = `smiley_${index + 3}`;
            } else {
              // fallback from smiles
              iconImg = 'star';
            }
          }

          const iconSource = `${config.hostname}/static-linear-icons/${iconImg}.png`;

          // TODO check styles
          // build icon link
          const currentItem =
            `<td style="width: ${iconSize}; height: ${iconSize};">` +
            '<span>' +
            `<a rel="noopener noreferrer" target="_blank" style="text-decoration: none;" href="${link}">` +
            `<img src="${iconSource}" alt="${icon}" width="100%" border="0"/>` +
            '</a>' +
            '</span>' +
            '</td>';

          acc += currentItem;

          return acc;
        }, '');

        // TODO styles + refactor copypaste
        // handle captions
        if (fromCaption || toCaption) {
          data.optionsCaptions = `<td colspan="${invResult.links.length + 1}" style="padding-top: 10px">` +
            '<table style="width: 100%">' +
            '<tr>' +
            `<td style="font-size: 12px; color:rgba(28, 46, 90, 0.5)" align="left">${fromCaption}</td>` +
            `<td style="font-size: 12px; color:rgba(28, 46, 90, 0.5)" align="right">${toCaption}</td>` +
            '</tr>' +
            '</table>' +
            '</td>';
        }

        data.optionsContent = optionsContent;

        return parseTpl(optionsTemplate, data, '');
      }
      case 'netPromoterScore': {
        const data = {};
        // load nps template
        const npsTemplate = await fs.readFile('server/mailers/firstQuestionHtml/optionsContent.html', 'utf8');
        // parse options
        const optionsContent = invResult.links.reduce((acc, link, index) => {
          const paddingLink = index !== 10 ? '12px 17px' : '11px 13px';
          const currentItem =
            `<td style="border-right: ${index !== 10 ? 1 : 0}px solid #E1E5EE; width: 43px; height: 43px; color: #000000; background-color: #FFFFFF; display: table-cell; vertical-align: middle; font-size: 18px; line-height: 28px;">` +
            `<a rel="noopener noreferrer" target="_blank" style="text-decoration: none; color: #000000; padding: ${paddingLink}" href="${link}">` +
            `${index}` +
            '</a>' +
            '</td>';

          acc += currentItem;

          return acc;
        }, '');

        const fromCaption = _.get(question, `linearScale.fromCaption.${lang}`);
        const toCaption = _.get(question, `linearScale.toCaption.${lang}`);

        // TODO styles + refactor copypaste
        // handle captions
        if (fromCaption || toCaption) {
          data.optionsCaptions = '<td colspan="11" style="padding-top: 10px">' +
            '<table style="width: 100%">' +
            '<tr>' +
            `<td style="font-size: 12px; color:rgba(28, 46, 90, 0.5)" align="left">${fromCaption}</td>` +
            `<td style="font-size: 12px; color:rgba(28, 46, 90, 0.5)" align="right">${toCaption}</td>` +
            '</tr>' +
            '</table>' +
            '</td>';
        }

        data.optionsContent = optionsContent;

        return parseTpl(npsTemplate, data, '');
      }
      default: {
        // for non-supported question types - return just button

        let submitUrl = '';

        if (target) submitUrl = `${config.hostname}/${target.company.urlName}/target/${target.token}`;
        if (invResult.invite) submitUrl = `${config.hostname}/survey?token=${invResult.invite.token}`;

        const data = {
          link: submitUrl,
          startLabel: 'Take the survey' // TODO make lang dynamic / change label?
        };

        // load btn template
        const btnTemplate = await fs.readFile('server/mailers/firstQuestionHtml/submitBtn.html', 'utf8');

        return parseTpl(btnTemplate, data, '');
      }
    }
  } catch (e) {
    return Promise.reject(e);
  }
}

export default {
  show,
  list,
  firstQuestionHtml
};
