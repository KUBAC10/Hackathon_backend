// base
import moment from 'moment';
// configurations
import config from '../../../config/env';
// access control
import accessControl from '../../helpers/accessControl';
import powerUser from '../access/powerUser';
import teamUser from '../access/teamUser';
// helpers
import parseSingleDateToRange from '../../helpers/parseSingleDateToRange';
import findUserByName from '../../helpers/findUserByName';
// models
import { Question, Survey } from '../../models';
import multiLangSearchBuilder from '../../helpers/multiLangSearchBuilder';

export default {
  list: {
    query: async (req) => {
      const {
        updatedBy, createdBy, createdAt, updatedAt, type, inputTypes,
        surveyName, surveyType, questionTypes, questionName, expireDate
      } = req.query;
      const { timeZone = config.timezone } = req.cookies;
      const { company } = req.scopes;
      const query = {
        stage: 'initial',
        type: type || { $in: ['survey', 'question', 'template'] },
      };

      // TODO tests
      if (questionTypes || inputTypes) {
        const questionQuery = {
          company,
          inTrash: true,
          $and: []
        };

        // default query for question type
        const questionTypesQuery = [];
        // add question type to default query if exists
        if (questionTypes) {
          questionTypesQuery.push({ type: questionTypes, input: { $exists: false } });
        }
        // add input types to default query if exists
        if (inputTypes) questionTypesQuery.push({ input: inputTypes });
        questionQuery.$and.push({ $or: questionTypesQuery });

        const questions = await Question.model.find(questionQuery).lean();

        query.question = { $in: questions.map(i => i._id) };
      }

      // TODO tests
      if (surveyName || surveyType) {
        const surveyQuery = {
          company,
          inTrash: true
        };

        if (surveyName) surveyQuery.$or = multiLangSearchBuilder('name', surveyName);
        if (surveyType) surveyQuery.surveyType = surveyType;

        const surveys = await Survey.model.find(surveyQuery)
          .lean();

        query.survey = { $in: surveys.map(i => i._id) };
      }

      // TODO tests
      if (questionName) {
        const questionQuery = {
          company,
          inTrash: true,
          $or: multiLangSearchBuilder('name', questionName)
        };

        const questions = await Question.model.find(questionQuery)
          .lean();

        query.question = { $in: questions.map(i => i._id) };
      }

      if (expireDate) {
        const { from, to } = expireDate;
        query.expireDate = {};
        if (from) {
          query.expireDate.$gte = moment(from)
            .startOf('day')
            .tz(timeZone);
        }
        if (to) {
          query.expireDate.$lte = moment(to)
            .endOf('day')
            .tz(timeZone);
        }
      }

      if (createdAt) {
        const { from, to } = createdAt;
        query.createdAt = {};
        if (from) {
          query.createdAt.$gte = moment(from)
            .startOf('day')
            .tz(timeZone);
        }
        if (to) {
          query.createdAt.$lte = moment(to)
            .endOf('day')
            .tz(timeZone);
        }
      }

      if (updatedAt) query.updatedAt = parseSingleDateToRange(updatedAt, timeZone);
      if (updatedBy) query.updatedBy = await findUserByName(updatedBy);
      if (createdBy) query.createdBy = await findUserByName(createdBy);

      return query;
    },
    auth: accessControl(powerUser('team'), teamUser('team')),
    select: 'createdAt expireDate type survey question surveyItem',
    populate: [
      {
        path: 'createdBy',
        select: 'name',
        match: { isAdmin: { $ne: true } }
      },
      {
        path: 'survey',
        select: 'name previewScreenShot surveyType',
      },
      {
        path: 'question',
        select: 'name type input'
      },
      {
        path: 'updatedBy',
        select: 'name',
        match: { isAdmin: { $ne: true } }
      }
    ],
    defaultSort: { createdAt: -1 }
  }
};
