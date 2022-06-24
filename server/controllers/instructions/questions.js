import _ from 'lodash';

// configurations
import config from '../../../config/env';

// models
import { Company } from '../../models';

// helpers
import sortByName from '../helpers/sortByName';
import searchByTag from '../helpers/searchByTag';
import findUserByName from '../../helpers/findUserByName';
import parseSingleDateToRange from '../../helpers/parseSingleDateToRange';
import multiLangSearchBuilder from '../../helpers/multiLangSearchBuilder';

// access control
import accessControl from '../../helpers/accessControl';
import powerUser from '../access/powerUser';
import teamUser from '../access/teamUser';
import templateMaker from '../access/templateMaker';

export default {
  list: {
    auth: accessControl(powerUser('team'), teamUser('team'), templateMaker()),
    query: async (req) => {
      const { lang } = req.cookies;
      const {
        tagName, name, type, trend, general, updatedBy, createdBy, language, questionTypes,
        inputTypes, createdAt, updatedAt, trendQuestion, inCurrentTeam, sort, description, isGlobal
      } = req.query;
      const { timeZone = config.timezone } = req.cookies;

      // load company to get open text questions config
      const company = await Company.model.findById(req.scopes.company);

      // process only general or trend questions
      // TODO tests
      // TODO refactor?
      const query = {
        $and: [
          { $or: [{ trend: true }, { general: true }] },
          { $or: [{ isGlobal: true }, req.scopes] },
          { inTrash: { $ne: true } }
        ]
      };

      // TODO add tests
      // if text questions are disabled - exclude them from query
      if (_.get(company, 'openTextConfig.disableTextQuestions')) {
        query.$and.push({
          $or: [{ type: { $ne: 'text' } }, { input: { $in: ['number', 'phone', 'email'] } }]
        });
      }

      // search by tag name
      if (tagName) {
        query._id = await searchByTag({
          tagName,
          entity: 'question',
          scopes: req.scopes
        });
      }

      // search global
      if (_.isBoolean(isGlobal)) query.isGlobal = isGlobal;

      // process only question from user current team
      if (inCurrentTeam) query.team = req.user.currentTeam;

      // TODO change name of property, dashboard trend questions - dedicated controller and query?
      if (trendQuestion) {
        // process only trend questions
        query.trend = true;
        // process only "options" type of questions
        query.type = {
          $in: [
            'thumbs',
            'slider',
            'dropdown',
            'checkboxes',
            'linearScale',
            'multipleChoice',
            'text',
            'netPromoterScore'
          ]
        };
      }

      // search by name
      if (name) {
        Object.assign(query, {
          $or: multiLangSearchBuilder('name', name)
        });
      }

      if (description) {
        // search by trend questions
        Object.assign(query, {
          $or: multiLangSearchBuilder('description', description)
        });
      }

      if (language) {
        query[`translation.${language}`] = { $eq: true };
      }

      // base filters
      if (typeof trend !== 'undefined') query.trend = trend;
      if (typeof general !== 'undefined') query.general = general;
      if (createdAt) query.createdAt = parseSingleDateToRange(createdAt, timeZone);
      if (updatedAt) query.updatedAt = parseSingleDateToRange(updatedAt, timeZone);
      if (updatedBy) query.updatedBy = await findUserByName(updatedBy);
      if (createdBy) query.createdBy = createdBy;
      // normalize sort by name with current language
      if (typeof sort === 'object' && Object.keys(sort).includes('name')) {
        sortByName({
          sort,
          query: req.query,
          lang
        });
      }

      // TODO adjust?
      if (type) query.type = type;
      if (questionTypes || inputTypes) {
        // default query for question type
        const questionTypesQuery = [];
        // add question type to default query if exists
        if (questionTypes) {
          questionTypesQuery.push({ type: questionTypes, input: { $exists: false } });
        }
        // add input types to default query if exists
        if (inputTypes) questionTypesQuery.push({ input: inputTypes });
        query.$and.push({ $or: questionTypesQuery });
      }

      req.scopes = _.omit(req.scopes, ['company', 'team']);

      return query;
    },
    populate: [
      {
        path: 'questionItems',
        select: 'createdAt team name translationLock quizResultText quizResultTextTranslationLock quizCorrect sortableId dataType bbImage icon imgCloudinary unsplashUrl',
        options: { sort: { sortableId: 1 } }
      },
      {
        path: 'gridRows',
        select: 'createdAt team name translationLock type',
        options: { sort: { sortableId: 1 } }
      },
      {
        path: 'gridColumns',
        select: 'createdAt team name translationLock type score',
        options: { sort: { sortableId: 1 } }
      },
      {
        path: 'updatedBy',
        select: 'name',
        match: { isAdmin: { $ne: true } }
      },
      {
        path: 'createdBy',
        select: 'name',
        match: { isAdmin: { $ne: true } }
      },
      {
        path: 'tagEntities',
        select: '-createdBy -updatedAt -updatedBy -__v',
        populate: [
          {
            path: 'tag', select: 'createdAt name description'
          }
        ]
      }
    ],
    defaultSort: { createdAt: -1 }
  },
  show: {
    auth: accessControl(powerUser(), teamUser('team'), templateMaker()),
    // process only general or trend questions
    query: async req => ({ $or: [{ trend: true }, { general: true }], _id: req.params.id }),
    populate: [
      {
        path: 'questionItems',
        select: 'createdAt team name translationLock quizResultText quizResultTextTranslationLock quizCorrect',
        options: { sort: { sortableId: 1 } }
      },
      {
        path: 'gridRows',
        select: 'createdAt team name translationLock type',
        options: { sort: { sortableId: 1 } }
      },
      {
        path: 'gridColumns',
        select: 'createdAt team name translationLock type score',
        options: { sort: { sortableId: 1 } }
      },
      {
        path: 'team',
        select: 'name',
      },
      {
        path: 'createdBy',
        select: 'name',
        match: { isAdmin: { $ne: true } }
      },
      {
        path: 'updatedBy',
        select: 'name',
        match: { isAdmin: { $ne: true } }
      },
      {
        path: 'tagEntities',
        select: '-createdBy -updatedAt -updatedBy -__v',
        populate: [
          {
            path: 'tag', select: 'createdAt name description'
          }
        ]
      },
      {
        path: 'trash'
      }
    ]
  }
};
