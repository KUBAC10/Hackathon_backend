import _ from 'lodash';

// configurations
import config from '../../../config/env';

// helpers
import sortByName from '../helpers/sortByName';
import searchByTag from '../helpers/searchByTag';
import searchByTagId from '../helpers/searchByTagId';
import findUserByName from '../../helpers/findUserByName';
import parseSingleDateToRange from '../../helpers/parseSingleDateToRange';
import multiLangSearchBuilder from '../../helpers/multiLangSearchBuilder';

// access control
import accessControl from '../../helpers/accessControl';
import powerUser from '../access/powerUser';
import teamUser from '../access/teamUser';
import liteUser from '../access/liteUser';

const surveySelectFields = 'defaultLanguage surveyType previewScreenShot questionsCount surveyInvitationMailer surveyCompleteMailer createdAt description updatedAt totalInvites lastAnswerDate totalResults totalCompleted name translation team active publicAccess urlName startDate endDate localization translationLockName translationLockDescription footer endPage logo allowReAnswer references publicTTL publicTTLView isGlobalTemplate scope approximateTime pulseDistribute scoring overallScore';
const surveySectionFields = 'surveyItems name description translationLockName translationLockDescription sortableId displaySingle pulseSurveyDriver';

export default {
  list: {
    auth: accessControl(powerUser('team'), teamUser('team')),
    query: async (req) => {
      const query = { inTrash: { $ne: true } };
      const { lang, timeZone = config.timezone } = req.cookies;
      const {
        tagName, categories, name, updatedBy, createdBy, createdAt, urlName, surveyType,
        publicAccess, active, totalCompleted, lastAnswerDate,
        updatedAt, notPublic, inCurrentTeam, sort, type, inDraft, language = []
      } = req.query;

      if (type) query.type = type;
      if (surveyType) query.surveyType = surveyType;
      if (typeof publicAccess !== 'undefined') query.publicAccess = publicAccess;
      if (typeof active !== 'undefined') query.active = active;
      if (typeof inDraft !== 'undefined') query.inDraft = inDraft;
      if (urlName) query.urlName = { $regex: urlName, $options: 'i' };
      if (totalCompleted) query.totalCompleted = { ...totalCompleted };
      if (inCurrentTeam) req.scopes.team = req.user.currentTeam;
      // search by tag name
      if (tagName) query._id = await searchByTag({ tagName, entity: 'survey', scopes: req.scopes });
      if (categories) query._id = await searchByTagId({ tagId: categories, entity: 'survey', scopes: req.scopes });
      if (createdAt) query.createdAt = parseSingleDateToRange(createdAt, timeZone);
      if (lastAnswerDate) query.lastAnswerDate = parseSingleDateToRange(lastAnswerDate, timeZone);
      if (updatedAt) query.updatedAt = parseSingleDateToRange(updatedAt, timeZone);
      if (updatedBy) query.updatedBy = await findUserByName(updatedBy);
      if (createdBy) query.createdBy = await findUserByName(createdBy);
      if (notPublic) query.publicAccess = { $ne: true };
      if (name) {
        query.$or = multiLangSearchBuilder('name', name);
      }
      if (language.length) {
        language.forEach((lang) => {
          query[`translation.${lang}`] = true;
        });
      }
      // normalize sort by name with current language
      if (typeof sort === 'object' && Object.keys(sort).includes('name')) {
        sortByName({
          sort,
          query: req.query,
          lang
        });
      }
      return query;
    },
    select: surveySelectFields,
    populate: [
      // TODO check if needed
      // {
      //   path: 'totalInvites'
      // },
      {
        path: 'pulseSurveyDrivers'
      },
      {
        path: 'surveyInvitationMailer',
        select: 'name _id'
      },
      {
        path: 'surveyCompleteMailer',
        select: 'name _id'
      },
      {
        path: 'updatedBy',
        select: 'name',
        match: { isAdmin: { $ne: true } }
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
    auth: accessControl(powerUser(), teamUser('team')),
    query: async (req) => {
      const { type } = req.query;
      const { id } = req.params;
      const query = { _id: id };

      if (type) query.type = type;

      return query;
    },
    customAccess: (doc, scopes) => {
      if (_.get(doc, 'scope.global')) return {};

      if (_.get(doc, 'scope.companies', []).length && scopes.company) {
        if (doc.scope.companies.map(c => c._id.toString()).includes(scopes.company.toString())) {
          return {};
        }
      }

      return scopes;
    },
    omit: ['scope'],
    select: surveySelectFields,
    populate: [
      {
        path: 'totalInvites'
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
        path: 'team',
        select: 'name',
      },
      {
        path: 'company',
        select: 'name urlName logo',
      },
      {
        path: 'surveyInvitationMailer',
        select: 'name _id'
      },
      {
        path: 'surveyCompleteMailer',
        select: 'name _id'
      },
      {
        path: 'surveySections',
        select: surveySectionFields,
        populate: [
          {
            path: 'surveyItems',
            select: '-createdAt -updatedAt -__v',
            populate: [
              {
                path: 'question',
                select: '-createdAt -updatedAt -__v',
                populate: [
                  {
                    path: 'questionItems',
                    select: '-createdAt -updatedAt -__v'
                  },
                  {
                    path: 'gridRows',
                    select: 'createdAt team name translationLock type',
                  },
                  {
                    path: 'gridColumns',
                    select: 'createdAt team name translationLock type score',
                  },
                ]
              },
              {
                path: 'notificationMailer.mailer',
                select: 'name _id'
              },
            ]
          }
        ]
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
      },
      {
        path: 'pulseSurveyDrivers'
      }
    ]
  },
  update: {
    auth: accessControl(powerUser(), teamUser('team'), liteUser()),
    select: surveySelectFields,
  },
};
