import async from 'async';
import _ from 'lodash';

// helpers
import buildQuery from './helpers/buildQuery';
import getSurveyResultsData from './helpers/getSurveyResultsData';
import summaryQuestionReport from '../reportsBuilder/helpers/summaryQuestionReport';

// models
import { SurveyItem } from '../../models';

export default async function segments(options = {}) {
  try {
    const { surveyItems = [], filters = {} } = options;
    const { createdAt: range } = filters;

    // init output
    const output = { global: [], segment: [] };

    // build query
    const query = buildQuery(options);

    // build select
    const select = surveyItems.reduce((acc, item) => `${acc} answer.${item}`, '');

    // get surveyResults data
    const data = await getSurveyResultsData({ query, select });

    // load surveyItems
    const surveyItemDocs = await SurveyItem.model
      .find({
        _id: surveyItems,
        type: ['question', 'trendQuestion'],
        inTrash: { $ne: true },
        inDraft: { $ne: true }
      })
      .populate([
        {
          path: 'question',
          match: { inTrash: { $ne: true }, inDraft: { $ne: true } },
          populate: [
            {
              path: 'questionItems',
              options: { sort: { sortableId: 1 } },
              select: 'name team createdAt localization',
              match: { unlink: { $ne: true }, inTrash: { $ne: true }, inDraft: { $ne: true } }
            },
            {
              path: 'gridRows',
              options: { sort: { sortableId: 1 } },
              select: 'name team createdAt localization',
              match: { unlink: { $ne: true }, inTrash: { $ne: true }, inDraft: { $ne: true } }
            },
            {
              path: 'gridColumns',
              options: { sort: { sortableId: 1 } },
              select: 'name team createdAt localization score',
              match: { unlink: { $ne: true }, inTrash: { $ne: true }, inDraft: { $ne: true } }
            }
          ]
        },
        {
          path: 'surveySection',
          select: 'sortableId',
        }
      ])
      .lean();

    // group survey items by sections
    const groupBySection = _.groupBy(surveyItemDocs.map(i => _.pick(i, '_id', 'sortableId', 'surveySection')), 'surveySection.sortableId');

    // get list of sorted surveyItemIds by order in survey
    const order = _.flatten(Object.keys(groupBySection)
      .map(key => _.sortBy(groupBySection[key], 'sortableId')
        .map(item => item._id.toString())));

    // handle selected from versus surveyItems
    await async.eachLimit(surveyItemDocs, 5, (surveyItem, cb) => {
      // get order index
      const index = order.indexOf(surveyItem._id.toString());

      // get filtered data from related surveyItem
      const segmentsData = data.map(d => ({ data: d[surveyItem._id] }));

      // get global and filtered summary report
      Promise.all([
        // get normal report by question
        summaryQuestionReport({ surveyItem, question: surveyItem.question, range }),
        // get report based on filtered data
        summaryQuestionReport({ surveyItem, question: surveyItem.question, segmentsData })
      ]).then(([global, segment]) => {
        output.global[index] = global;
        output.segment[index] = segment;

        cb();
      }).catch(cb);
    });

    return output;
  } catch (e) {
    /* istanbul ignore next */
    console.error(e);
  }
}
