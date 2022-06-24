import httpStatus from 'http-status';
import _ from 'lodash';
import csv from 'csv';
import moment from 'moment';
import async from 'async';
import uuid from 'uuid';
import faker from 'faker';
import he from 'he';
import striptags from 'striptags';
import mongoose from 'mongoose';

// configurations
import config from '../../../../config/env';

// models
import {
  Content,
  Country,
  Survey,
  Invite,
  Company,
  SurveyResult,
  SurveyItem,
  QuestionStatistic,
  PulseSurveyRoundResult,
  PulseSurveyRound,
  PulseSurveyRecipient,
  SurveyCampaign, Target
} from '../../../models';

// helpers
import updateSurveyCounters from '../../../helpers/updateSurveyCounters';
import {
  handleScopes,
  surveyAccess,
  checkPermission,
  hasAccess,
  createSurveyFromData
} from '../../helpers';

// mongoose helpers
import { initSession } from '../../../helpers/transactions';
import APIMessagesExtractor from '../../../services/APIMessagesExtractor';
import CloudinaryUploader from '../../../services/CloudinaryUploader';
import loadSurveyDoc from '../../helpers/loadSurveyDoc';

const isObjectId = mongoose.Types.ObjectId.isValid;

/** GET /api/v1/surveys/:companyUrlName/:surveyUrlName
 * Return base public survey data by company/survey urlNames */
async function base(req, res, next) {
  try {
    const { lang, timeZone = config.timezone } = req.cookies;
    const { companyUrlName, surveyUrlName } = req.params;

    // load survey by query params
    const company = await Company.model
      .findOne({ urlName: companyUrlName })
      .lean();

    if (!company) return res.sendStatus(httpStatus.NOT_FOUND);

    const survey = await Survey.model
      .findOne({ company, urlName: surveyUrlName, publicAccess: true })
      .select('name description startDate endDate defaultLanguage translation company.companyColors surveyTheme previewScreenShot surveyType cookiesCheck')
      .populate([{ path: 'surveyTheme' }])
      .lean();

    if (!survey) return res.sendStatus(httpStatus.NOT_FOUND);

    const { startDate, endDate } = survey;

    // check survey duration time
    const noAccess = await surveyAccess({ lang, timeZone, startDate, endDate });

    if (noAccess) return res.send({ ...survey, message: noAccess });

    // return base survey data for public survey
    return res.json(_.omit(survey, ['startDate', 'endDate']));
  } catch (e) {
    /* istanbul ignore next */
    return next(e);
  }
}

/** GET /api/v1/surveys/by-token/:token
 * Return base survey data by token */
async function baseByToken(req, res, next) {
  try {
    const { lang, timeZone = config.timezone } = req.cookies;
    const { token } = req.params;

    const invite = await Invite.model.findOne({ token }).lean();

    let pulseSurveyRoundResult;
    let target;

    if (!invite) {
      pulseSurveyRoundResult = await PulseSurveyRoundResult.model
        .findOne({ token })
        .lean();

      if (!pulseSurveyRoundResult) {
        // find target by token
        target = await Target.model
          .findOne({ token })
          .lean();

        if (!target) return res.sendStatus(httpStatus.FORBIDDEN);
      }
    }

    // load survey by query params
    const survey = await Survey.model
      .findOne({ _id: _.get(invite || pulseSurveyRoundResult || target, 'survey') })
      .select('name description startDate endDate defaultLanguage translation cookiesCheck')
      .populate([{ path: 'surveyTheme' }])
      .lean();

    if (!survey) return res.sendStatus(httpStatus.NOT_FOUND);

    const { startDate, endDate } = survey;

    // check survey duration time
    const noAccess = await surveyAccess({ lang, timeZone, startDate, endDate });

    if (noAccess && !invite.preview) return res.send({ ...survey, message: noAccess });

    // return base survey data for private survey
    return res.json(_.omit(survey, ['startDate', 'endDate']));
  } catch (e) {
    /* istanbul ignore next */
    return next(e);
  }
}

/** GET /api/v1/surveys/:id/download-results-csv */
async function downloadResultsCSV(req, res, next) {
  try {
    const { id } = req.params;
    const { language } = req.query;
    let countries;

    // load survey
    const survey = await Survey.model
      .findById(id)
      .populate({
        path: 'surveySections',
        match: {
          hide: { $ne: true },
          inDraft: { $ne: true }
        },
        populate: {
          path: 'surveyItems',
          match: {
            type: { $in: ['question', 'trendQuestion'] },
            inTrash: { $ne: true },
            hide: { $ne: true },
            inDraft: { $ne: true }
          },
          populate: [
            {
              path: 'question',
              populate: [
                {
                  path: 'questionItems',
                  match: {
                    inTrash: { $ne: true },
                    inDraft: { $ne: true }
                  }
                },
                {
                  path: 'gridRows',
                  match: {
                    inTrash: { $ne: true },
                    inDraft: { $ne: true }
                  }
                },
                {
                  path: 'gridColumns',
                  match: {
                    inTrash: { $ne: true },
                    inDraft: { $ne: true }
                  }
                }
              ]
            },
            {
              path: 'flowLogic',
              match: {
                inDraft: { $ne: true }
              }
            }
          ]
        }
      })
      .lean();

    if (!survey) return res.sendStatus(httpStatus.NOT_FOUND);

    // return error if survey have not requested translation
    if (!survey.translation[language]) {
      return res
        .status(httpStatus.BAD_REQUEST)
        .send({
          message: 'Survey have not translation to this language, please select another'
        });
    }

    // load content
    const content = await Content.model.findOne({ nameShort: language }).lean();

    // load all survey results
    const surveyResults = await SurveyResult.model
      .find({
        survey: survey._id,
        preview: { $ne: true }
      })
      .populate('contact tags')
      .lean();

    let flow = false; // set true if survey has flow logic to add column in csv file

    const surveyItems = survey.surveySections.reduce((acc, { surveyItems = [] }) => {
      if (!flow && surveyItems.some(item => item.flowLogic.length)) flow = true;

      return [...acc, ...surveyItems];
    }, []);

    // define columns
    const columns = surveyItems
      .map(i => i.question)
      .map(i => striptags(he.decode(i.name[language] || i.name[Object.keys(i.name)[0]] || '')));

    // add meta
    columns.push('meta');

    // load countries
    if (surveyItems.some(i => _.get(i, 'question.type') === 'countryList')) {
      countries = await Country.model
        .find()
        .select('_id name')
        .lean();
    }

    // parse results data
    const data = surveyResults.map((surveyResult) => {
      const resultRow = [];
      const answers = surveyResult.answer || {};

      // set ID
      resultRow.push(surveyResult._id.toString());

      // set date
      resultRow.push(moment.utc(surveyResult.createdAt).format('DD/MM/YYYY HH:mm'));

      // add score column
      if (survey.scoring) resultRow.push(surveyResult.scorePoints || 0);

      // set contact or fingerprintId
      resultRow.push(surveyResult.contact ? surveyResult.contact.name : surveyResult.fingerprintId);

      // set tags
      resultRow.push((surveyResult.tags || []).map(i => i.name));

      // set flow
      if (flow && answers.flow && answers.flow.length) {
        const flowRow = answers.flow.reduce((acc, step) => {
          const section = survey.surveySections.find(s => s.step === step);

          if (section && section.name && section.name[language]) {
            return `${acc} ${section.name[language]},`;
          }

          return `${acc} Section ${step},`;
        }, '');

        resultRow.push(`${flowRow} 'EndPage.'`);
      }

      // set all question data
      surveyItems.forEach((surveyItem) => {
        // get answer
        const answer = answers[surveyItem._id];
        const question = surveyItem.question;

        // survey result item not found - we have no answer on current question
        if (!answer) return resultRow.push('');

        // text, linear scale, thumbs, slider
        if (['text', 'linearScale', 'thumbs', 'slider'].includes(question.type)) {
          if (question.input === 'date') {
            answer.value = _getDateResult(question, answer.value);
          }

          return resultRow.push(answer.value);
        }

        if (question.type === 'netPromoterScore') {
          const { value, customAnswer } = answer;

          let result = '';

          if (value || value === 0) result = `${value}`;
          if (customAnswer) result = `${result}, ${customAnswer}`;

          return resultRow.push(result);
        }

        // multiple choice, checkboxes, dropdown
        if (['multipleChoice', 'checkboxes', 'dropdown', 'imageChoice'].includes(question.type)) {
          const result = (answer.questionItems || []).reduce((res, currentValue) => {
            // load question item
            const questionItem = question.questionItems
              .find(i => i._id.toString() === currentValue.toString());
            // question item not present - skip
            if (!questionItem) return res;
            // get translated name or load first present
            const name = striptags(he.decode(questionItem.name[language]
              || questionItem.name[Object.keys(questionItem.name)[0]]));

            // check if initial and return
            return res ? `${res}, ${name}` : name;
          }, '');

          if (answer.customAnswer) return resultRow.push(result ? `${result}, ${answer.customAnswer}` : answer.customAnswer);

          return resultRow.push(result);
        }

        // multiple choice matrix, checkbox matrix
        if (['multipleChoiceMatrix', 'checkboxMatrix'].includes(question.type)) {
          // for matrix questions - survey result item created for each crossing
          // TODO check if work correct
          const result = (answer.crossings || []).reduce((res, currentValue) => {
            // load matrix column
            const column = question.gridColumns
              .find(i => i._id.toString() === currentValue.gridColumn.toString());

            // load matrix row
            const row = question.gridRows
              .find(i => i._id.toString() === currentValue.gridRow.toString());

            if (!column || !row) return res;

            // get translated names or load first present
            const columnName = column.name[language] || column.name[Object.keys(column.name)[0]];

            const rowName = row.name[language] || row.name[Object.keys(row.name)[0]];

            // check if initial and return
            return res ? `${res}; ${columnName} - ${rowName}` : `${columnName} - ${rowName}`;
          }, '');

          return resultRow.push(result);
        }

        // country list
        if (question.type === 'countryList') {
          const country = countries.find(c => c._id.toString() === answer.country);

          if (country && country.name) return resultRow.push(country.name);
        }

        // process unknown type
        return resultRow.push('');
      });

      // set meta
      resultRow.push(JSON.stringify(surveyResult.meta || '').replace(/;/g, '|'));

      return resultRow;
    });

    // TODO process grid types

    // add flow
    if (flow) columns.unshift('Flow');

    // add tag column
    columns.unshift(content.labels.tags || 'Tags');

    // add contact column
    columns.unshift(content.labels.contact || 'Contact');

    // add score column
    if (survey.scoring) columns.unshift('Score');

    // add date column
    columns.unshift(content.labels.startedAtUTC || 'Started At (UTC)');

    // add id field
    columns.unshift('"ID"');

    // stringify data and send CSV
    csv.stringify(data, { columns, header: true }, (err, output) => {
      const defaultSeparator = 'sep=,\n';

      res.contentType('text/csv');
      res.setHeader('Content-disposition', `attachment; filename=${encodeURIComponent(survey.name[language])}.csv`);

      return res.send(`${defaultSeparator}${output}`);
    });
  } catch (e) {
    /* istanbul ignore next */
    return next(e);
  }
}

/** GET /api/v1/surveys/:id/download-json - export survey to json file */
async function downloadJSON(req, res, next) {
  try {
    const { id } = req.params;

    // load survey
    const survey = await loadSurveyDoc({ _id: id });

    if (!survey) return res.sendStatus(httpStatus.NOT_FOUND);

    if (!hasAccess(survey, req.scopes)) return res.sendStatus(httpStatus.FORBIDDEN);

    res.contentType('application/json');

    const surveyJSON = JSON.stringify(_cropObject(survey));

    return res.json(surveyJSON);
  } catch (e) {
    /* istanbul ignore next */
    return next(e);
  }
}

/** POST /api/v1/surveys/upload-json - import survey from json file */
async function uploadJSON(req, res, next) {
  const session = await initSession();
  try {
    const { file } = req;
    const { isLite } = req.user;

    if (!file || !file.buffer) return res.sendStatus(httpStatus.BAD_REQUEST);

    const data = JSON.parse(file.buffer.toString('utf8'));

    if (isLite && data.surveyType === 'pulse') {
      return res.status(httpStatus.BAD_REQUEST)
        .send({ message: 'Incorrect file format' });
    }

    if (!_.isObject(data) || !data._id) return res.sendStatus(httpStatus.BAD_REQUEST);

    let surveyId;

    await session.withTransaction(async () => {
      surveyId = await createSurveyFromData({
        user: req.user,
        data,
        session
      });
    });

    return res.send(surveyId);
  } catch (e) {
    /* istanbul ignore next */
    return next(e);
  }
}

/** GET /api/v1/surveys/:id/count-fake-data - return fake data counter */
async function countFakeData(req, res, next) {
  try {
    const { id } = req.params;
    const { fakeDataAccess } = req.user;

    // load survey
    const survey = await Survey.model
      .findById(id)
      .select('_id company team')
      .lean();

    if (!survey) return res.sendStatus(httpStatus.NOT_FOUND);

    if (!hasAccess(survey, req.scopes) || !fakeDataAccess) {
      return res.sendStatus(httpStatus.FORBIDDEN);
    }

    // count fake results
    const count = await SurveyResult.model
      .find({ survey: survey._id, fake: true })
      .countDocuments();

    return res.send({ count });
  } catch (e) {
    /* istanbul ignore next */
    return next(e);
  }
}

/** GET /api/v1/surveys/:id/count-hidden-responses - return hidden responses counter */
async function countHiddenResponses(req, res, next) {
  try {
    const { id } = req.params;

    // load survey
    const survey = await Survey.model
      .findById(id)
      .select('_id company team')
      .lean();

    if (!survey) return res.sendStatus(httpStatus.NOT_FOUND);

    if (!hasAccess(survey, req.scopes)) return res.sendStatus(httpStatus.FORBIDDEN);

    // count fake results
    const count = await SurveyResult.model
      .find({ survey: survey._id, hide: true })
      .countDocuments();

    return res.send({ count });
  } catch (e) {
    /* istanbul ignore next */
    return next(e);
  }
}

/** POST /api/v1/surveys/:id/create-fake-data */
async function generateFakeData(req, res, next) {
  const session = await initSession();
  try {
    const { id } = req.params;
    const { numberOfResults = 10, tags, targets } = req.body;
    const user = req.user;

    const datesSet = new Set();

    let countries;
    let rounds;
    let recipients;

    if (!user.fakeDataAccess) return res.sendStatus(httpStatus.FORBIDDEN);

    // load survey
    const survey = await Survey.model.findById(id).select('_id team company startDate endDate surveyType');

    if (!survey) return res.sendStatus(httpStatus.NOT_FOUND);

    if (!hasAccess(survey, req.scopes)) return res.sendStatus(httpStatus.FORBIDDEN);

    // create base result data for public survey
    const base = {
      team: survey.team,
      company: survey.company,
      survey: survey._id,
      completed: true,
      empty: false,
      fake: true
    };

    // load related surveyItems
    const surveyItems = await SurveyItem.model
      .find({
        survey: survey._id,
        type: { $in: ['question', 'trendQuestion'] },
        inTrash: { $ne: true }
      })
      .select('question customAnswer')
      .populate([{
        path: 'question',
        select: 'gridRows gridColumns linearScale countries type input textComment',
        populate: [
          {
            path: 'questionItems',
            select: '_id'
          },
          {
            path: 'gridRows',
            select: '_id',
          },
          {
            path: 'gridColumns',
            select: '_id',
          }
        ]
      }])
      .lean();

    // load countries if one of question is countryList type
    if (surveyItems.some(i => i.question.type === 'countryList')) {
      countries = await Country.model
        .find()
        .select('_id')
        .lean();

      countries = countries.map(c => c._id.toString());
    }

    // load rounds if survey pulse
    if (survey.surveyType === 'pulse') {
      [
        rounds,
        recipients
      ] = await Promise.all([
        PulseSurveyRound.model
          .find({ survey: survey._id })
          .select('_id')
          .lean(),
        PulseSurveyRecipient.model
          .find({ survey: survey._id })
          .select('_id')
          .lean()
      ]);
    }

    await session.withTransaction(async () => {
      // TODO check limit size
      await async.eachLimit(_.times(numberOfResults), 20, (index, cb) => {
        // generate random date
        const date = _randomDate(survey.startDate, survey.endDate);

        // add date to set
        datesSet.add(moment(date).startOf('hour').toISOString());

        // make answer on each survey item
        const answer = surveyItems.reduce((acc, surveyItem) => {
          const { question = {}, _id } = surveyItem;

          // set country ids on appropriate question
          if (question.type === 'countryList') question.countries = countries;

          // set answer object
          acc[_id] = _getFakeAnswer(question);

          // check and generate custom answers for checkboxes, multiple choice and netPromoterScore
          if (surveyItem.customAnswer || question.textComment) {
            acc[_id].customAnswer = faker.lorem.sentence();
          }

          return acc;
        }, {});

        // create new survey result
        const surveyResult = new SurveyResult
          .model({
            ...base,
            fingerprintId: uuid(),
            createdAt: date,
            answer,
            tags: _.sample(tags),
            target: _.sample(targets),
            location: {
              city: faker.address.city(),
              country: faker.address.country()
            },
            device: _.sample(['isTablet', 'isMobile', 'isDesktop'])
          });

        if (rounds && rounds.length) {
          surveyResult.pulseSurveyRound = _.sample(rounds);
        }

        if (recipients && recipients.length) {
          surveyResult.recipient = _.sample(recipients);
        }

        // save
        surveyResult
          .save({ session })
          .then(() => cb())
          .catch(cb);
      });

      // get question and surveyItemsIds pairs
      const pairs = surveyItems
        .filter(i => i.question.type !== 'text')
        .map((i => ({
          question: i.question._id,
          surveyItem: i._id
        })));

      // iterate dates surveyItems and question
      // set syncDB to questionStatistic entities
      await async.mapLimit(datesSet, 5, (date, cb) => {
        async.eachLimit(pairs, 5, (p, callback) => {
          QuestionStatistic.model
            .updateOne(
              { time: new Date(date), ...p },
              { $set: { syncDB: false } },
              { upsert: true })
            .session(session)
            .then(() => callback())
            .catch(callback);
        }, (err) => {
          if (err) return cb(err);

          cb();
        });
      });

      const [
        lastSurveyResult,
        totalCompleted,
        totalResults
      ] = await Promise.all([
        SurveyResult.model
          .findOne({ survey: survey._id })
          .sort({ createdAt: -1 })
          .select('createdAt')
          .session(session)
          .lean(),
        SurveyResult.model
          .find({ survey: survey._id, completed: true })
          .session(session)
          .countDocuments(),
        SurveyResult.model
          .find({ survey: survey._id })
          .session(session)
          .countDocuments()
      ]);

      // increment counters and set last answer date
      await Survey.model.update(
        { _id: survey._id },
        {
          $set: {
            lastAnswerDate: lastSurveyResult ? lastSurveyResult.createdAt : new Date(),
            totalCompleted,
            totalResults
          },
        });
    });

    return res.sendStatus(httpStatus.CREATED);
  } catch (e) {
    /* istanbul ignore next */
    return next(e);
  }
}

/** DELETE /api/v1/surveys/:id/remove-fake-data */
async function removeFakeData(req, res, next) {
  const session = await initSession();
  try {
    const { id } = req.params;
    const { lang } = req.cookies;

    const surveyResults = await SurveyResult.model.find({ survey: id, fake: true });

    if (!surveyResults.length) {
      const message = await APIMessagesExtractor.getMessage(lang, 'survey.noFakeResults');
      return res.status(httpStatus.OK).send({ message });
    }

    await session.withTransaction(async () => {
      await async.eachLimit(surveyResults, 5, (result, cb) => {
        result.remove({ session })
          .then(() => cb())
          .catch(cb);
      });

      await updateSurveyCounters(id, session);
    });

    return res.sendStatus(httpStatus.NO_CONTENT);
  } catch (e) {
    /* istanbul ignore next */
    return next(e);
  }
}

/** DELETE /api/v1/surveys/:id */
async function destroy(req, res, next) {
  try {
    const { id } = req.params;
    const { user } = req;
    const query = { _id: id, inTrash: { $ne: true } };

    const survey = await Survey.model.findOne(query);

    // TODO adjust errors for global templates or team scope
    if (!survey) return res.sendStatus(httpStatus.NOT_FOUND);

    if (!hasAccess(survey, req.scopes)) return res.sendStatus(httpStatus.FORBIDDEN);

    if (!checkPermission({ user, doc: survey })) return res.sendStatus(httpStatus.FORBIDDEN);

    await survey.softDelete({
      _req_user: { _id: req.user._id },
      type: survey.type // type of survey, -> "survey", "template"
    });

    return res.sendStatus(httpStatus.NO_CONTENT);
  } catch (e) {
    /* istanbul ignore next */
    return next(e);
  }
}

/** PUT /api/v1/surveys/:id/remove-logo */
async function removeLogo(req, res, next) {
  const session = await initSession();
  try {
    const { id } = req.params;
    const query = { _id: id };

    handleScopes({ reqScopes: req.scopes, query });

    const survey = await Survey.model.findOne(query);

    if (!survey) return res.sendStatus(httpStatus.NOT_FOUND);

    await CloudinaryUploader.cleanUp({ public_id: survey.logo.public_id });

    survey.logo = undefined;

    await session.withTransaction(async () => await survey.save({ session }));

    return res.sendStatus(httpStatus.NO_CONTENT);
  } catch (e) {
    /* istanbul ignore next */
    return next(e);
  }
}

/** GET /api/v1/surveys/:id/tags - return tags list by survey campaigns */
async function tags(req, res, next) {
  try {
    const { id } = req.params;
    const { value } = req.query;

    const survey = await Survey.model
      .findOne({ _id: id })
      .lean();

    if (!survey) return res.sendStatus(httpStatus.NOT_FOUND);

    if (!hasAccess(survey, req.scopes)) return res.sendStatus(httpStatus.FORBIDDEN);

    const populate = { path: 'tags', populate: 'entitiesCount' };

    if (value) populate.match = { name: { $regex: value, $options: 'i' } };

    const campaign = await SurveyCampaign.model
      .find({ survey: survey._id })
      .populate(populate)
      .lean();

    if (!campaign.length) return res.sendStatus(httpStatus.NOT_FOUND);

    const tags = campaign.reduce((acc, campaign) => {
      const { tags = [] } = campaign;

      return [...acc, ...tags];
    }, []);

    return res.send({
      resources: _.uniqWith(tags, _.isEqual),
      total: tags.length
    });
  } catch (e) {
    return next(e);
  }
}

/** GET /api/v1/surveys/:id/public-template - return public template */
async function publicTemplate(req, res, next) {
  try {
    const survey = await Survey.model
      .findOne({
        _id: req.params.id,
        type: 'template'
      })
      .populate({
        path: 'tagEntities',
        populate: {
          path: 'tag'
        }
      })
      .select('tagEntities name description questionsCount approximateTime defaultLanguage publicPreview previewScreenShot')
      .lean();

    if (!survey) return res.sendStatus(httpStatus.NOT_FOUND);

    if (!survey.publicPreview) return res.sendStatus(httpStatus.FORBIDDEN);

    return res.send(survey);
  } catch (e) {
    return next(e);
  }
}

/** GET /api/v1/surveys/:id/public-template-link - return link for public template */
async function publicTemplateLink(req, res, next) {
  try {
    const survey = await Survey.model
      .findOne({
        _id: req.params.id,
        type: 'template'
      })
      .lean();

    if (!survey) return res.sendStatus(httpStatus.NOT_FOUND);

    if (!survey.publicPreview) return res.sendStatus(httpStatus.FORBIDDEN);

    const token = uuid();

    const doc = new Invite.model({
      token,
      survey,
      preview: true,
      type: 'global'
    });

    await doc.save();

    return res.send({ link: `${config.hostname}/survey?token=${token}` });
  } catch (e) {
    return next(e);
  }
}

/** GET /api/v1/surveys/:companyUrlName/target/:token - return survey base by target token */
async function targetBase(req, res, next) {
  try {
    const { lang, timeZone = config.timezone } = req.cookies;
    const { companyUrlName, token } = req.params;

    // load survey by query params
    const company = await Company.model
      .findOne({ urlName: companyUrlName })
      .lean();

    if (!company) return res.sendStatus(httpStatus.NOT_FOUND);

    // load target by token
    const target = await Target.model
      .findOne({
        token,
        company: company._id
      })
      .lean();

    if (!target) return res.sendStatus(httpStatus.FORBIDDEN);

    // load survey
    const survey = await Survey.model
      .findOne({ _id: target.survey, surveyType: { $ne: 'pulse' } })
      .select('name description startDate endDate defaultLanguage translation company.companyColors surveyTheme previewScreenShot surveyType')
      .populate([
        {
          path: 'surveyTheme'
        },
        {
          path: 'company',
          populate: {
            path: 'companyColors'
          }
        }
      ])
      .lean();

    if (!survey) return res.sendStatus(httpStatus.NOT_FOUND);

    const { startDate, endDate } = survey;

    // check survey duration time
    const noAccess = await surveyAccess({ lang, timeZone, startDate, endDate });

    if (noAccess) return res.send({ ...survey, message: noAccess });

    // return base survey data for public survey
    return res.json({
      ..._.omit(survey, ['startDate', 'endDate']),
      targetId: target._id.toString()
    });
  } catch (e) {
    return next(e);
  }
}

function _randomDate(start = moment().subtract(2, 'month').toDate(), end = moment().toDate()) {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime())); // eslint-disable-line
}

function _getFakeAnswer(question) {
  const {
    type,
    input,
    questionItems,
    gridRows,
    gridColumns,
    linearScale = {},
    countries
  } = question;

  switch (type) {
    case 'text': {
      if (input) {
        if (['number', 'phone'].includes(input)) return { value: _.sample(_.range(0, 1000 * 1000)) };

        if (input === 'email') return { value: faker.internet.email() };
      }

      return { value: faker.lorem.sentence() };
    }
    case 'dropdown':
    case 'multipleChoice': return {
      questionItems: [_.sample(questionItems.map(i => i._id.toString()))]
    };
    case 'imageChoice':
    case 'checkboxes': return {
      questionItems: _.sampleSize(
        questionItems.map(i => i._id.toString()),
        _.random(1, questionItems.length))
    };
    case 'linearScale':
    case 'slider': return {
      value: _.sample(_.range(linearScale.from, linearScale.to + 1))
    };
    case 'checkboxMatrix':
    case 'multipleChoiceMatrix': return {
      crossings: gridColumns.map(c => ({
        gridRow: _.sample(gridRows)._id.toString(),
        gridColumn: c._id.toString()
      }))
    };
    case 'thumbs': return {
      value: _.sample(['yes', 'no'])
    };
    case 'netPromoterScore': return {
      value: _.random(1, 10)
    };
    case 'countryList': return {
      country: _.sample(countries)
    };
    default: return {};
  }
}

function _cropObject(object) {
  const excludes = ['urlName', 'team', 'company', 'draftData', 'createdAt', 'updatedAt', '__v', 'notificationMailer', 'previewScreenShot'];

  return Object.entries(object).reduce((acc, [key, value]) => {
    if (excludes.includes(key)) return acc;

    if (_.isArray(value)) {
      acc[key] = value.map((item) => {
        if (!_.isString(item) && !isObjectId(item)) return _cropObject(item);

        return item;
      });

      return acc;
    }

    if (_.isPlainObject(value)) {
      acc[key] = _cropObject(value);

      return acc;
    }

    acc[key] = value;

    return acc;
  }, {});
}

function _getDateResult(question, answer) {
  const { dateParams = {} } = question;
  const { type: dateType, dateFormat, timeFormat } = dateParams;

  // normalize date/time format
  const normalizeDateFormat = _getDateFormat(dateFormat);
  const normalizeTimeFormat = timeFormat === 'twelveHourFormat' ? 'hh:mm a' : 'HH:mm';

  const splitDate = answer.split('-');
  const startDate = splitDate[0] && moment(splitDate[0]).format(normalizeDateFormat);
  const startTime = splitDate[1] && moment(splitDate[1]).format(normalizeTimeFormat).toUpperCase();
  const endDate = splitDate[2] && moment(splitDate[2]).format(normalizeDateFormat);
  const endTime = splitDate[3] && moment(splitDate[3]).format(normalizeTimeFormat).toUpperCase();
  const rangeSeparator = (dateType === 'range' || dateType === 'rangeAndTime') ? '-' : '';

  const result = `${startDate} ${startTime} ${rangeSeparator} ${endDate} ${endTime}`;

  return result;
}

function _getDateFormat(value) {
  switch (value) {
    case 'ddmmyyyy':
      return 'DD MMMM, YYYY';
    case 'mmddyyyy':
      return 'MMMM DD, YYYY';
    case 'yyyymmdd':
      return 'YYYY, MMMM DD';
    default:
      return false;
  }
}

export default {
  base,
  destroy,
  baseByToken,
  countFakeData,
  countHiddenResponses,
  removeFakeData,
  generateFakeData,
  removeLogo,
  downloadResultsCSV,
  downloadJSON,
  uploadJSON,
  tags,
  publicTemplate,
  publicTemplateLink,
  targetBase
};
