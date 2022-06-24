import chalk from 'chalk';
import Moment from 'moment-timezone';
import { extendMoment } from 'moment-range';

// models
import {
  SurveyReport,
  SurveyResult,
  SurveyItem,
  Question
} from '../../../models';

const moment = extendMoment(Moment);

export default async function textQuestionReport(options = {}) {
  try {
    const { surveyItem, surveyItems: surveyItemIds, question, timeZone, range, reportId } = options;
    const { skip, limit } = options.text;
    const match = {};
    const project = { survey: 1, contact: 1, surveyResult: '$_id', date: '$createdAt' };

    // get first and last survey result items of given question to get overall range
    if (range && range.from && range.to) {
      match.createdAt = {
        $gte: moment(range.from).tz(timeZone).startOf('day').toDate(),
        $lte: moment(range.to).tz(timeZone).endOf('day').toDate()
      };
    }

    // apply report range
    if (reportId) {
      const surveyReport = await SurveyReport.model
        .findOne({ _id: reportId });

      if (surveyReport) {
        const range = surveyReport.getRange();

        if (range && (range.from || range.to)) {
          match.createdAt = {};

          if (range.from) match.createdAt.$gte = range.from.toDate();
          if (range.to) match.createdAt.$lte = range.to.toDate();
        }
      }
    }

    if (surveyItem) {
      // set match
      match[`answer.${surveyItem._id}.value`] = { $exists: true };

      // set project
      project[`answer.${surveyItem._id}.value`] = 1;
    } else {
      const surveyItemsQuery = { question: question._id };

      if (surveyItemIds && surveyItemIds.length) {
        surveyItemsQuery._id = { $in: surveyItemIds };
      }

      // load related survey items
      const surveyItems = await SurveyItem.model
        .find(surveyItemsQuery)
        .select('_id')
        .lean();

      if (!surveyItems.length) {
        return {
          question,
          resources: [],
          total: 0
        };
      }

      // init or
      match.$or = [];

      // handle each survey item
      surveyItems.forEach((item) => {
        // set survey item to match
        match.$or.push({ [`answer.${item._id}.value`]: { $exists: true } });

        // set project
        project[`answer.${item._id}.value`] = 1;
      });
    }

    // init aggregate
    const aggregate = [
      {
        $match: match
      },
      {
        $lookup: {
          from: 'Contact',
          as: 'contact',
          localField: 'contact',
          foreignField: '_id'
        }
      },
      {
        $unwind: {
          path: '$contact',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $project: project
      },
      {
        $skip: skip
      },
      {
        $limit: limit
      }
    ];

    // load data
    const [
      reloadQuestion,
      resources,
      total
    ] = await Promise.all([
      Question.model.findOne({ _id: question._id }, 'name type input').lean(),
      SurveyResult.model.aggregate(aggregate),
      SurveyResult.model.find(match).countDocuments(),
    ]);

    return {
      total,
      question: Object.assign(reloadQuestion, {
        surveyItem: surveyItem ? surveyItem._id : undefined
      }),
      resources: resources.map(r => ({
        text: r.answer[Object.keys(r.answer).find(key => !!r.answer[key].value)].value,
        date: moment(r.date).tz(timeZone),
        survey: r.survey,
        contact: r.contact,
        surveyResult: r.surveyResult,
      }))
    };
  } catch (e) {
    console.log(chalk.red(`Aggregate text answer error: ${e}`));
    return Promise.reject(e);
  }
};
