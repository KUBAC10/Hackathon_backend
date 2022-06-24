import mongoose from 'mongoose';
import _ from 'lodash';

import { Survey, SurveyTheme } from '../../models';

const toObjectId = mongoose.Types.ObjectId;

export default async function loadDraftSurvey(query) {
  try {
    const doc = await _loadSurveyDoc(query);

    return {
      ..._.merge(doc, doc.draftData),
      startPages: doc.startPages
        .map(startPage => ({ ..._.merge(startPage, startPage.draftData) }))
        .sort(sortBySortableId),
      endPages: doc.endPages
        .map(endPage => ({ ..._.merge(endPage, endPage.draftData) }))
        .sort(sortBySortableId),
      surveySections: doc.surveySections
        .map(section => ({
          ..._.merge(section, section.draftData),
          surveyItems: section.surveyItems
            .map(item => ({
              ..._.merge(item, item.draftData),
              question: {
                ..._.merge(item.question, _.get(item, 'question.draftData')),
                questionItems: _.get(item, 'question.questionItems', [])
                  .map(i => ({ ..._.merge(i, i.draftData) }))
                  .sort(sortBySortableId),
                gridRows: _.get(item, 'question.gridRows', [])
                  .map(i => ({ ..._.merge(i, i.draftData) }))
                  .sort(sortBySortableId),
                gridColumns: _.get(item, 'question.gridColumns', [])
                  .map(i => ({ ..._.merge(i, i.draftData) }))
                  .sort(sortBySortableId)
              },
              flowLogic: item.flowLogic.map(logic => ({
                ..._.merge(logic, logic.draftData),
                flowItems: logic.flowItems
                  .map(i => ({ ..._.merge(i, i.draftData) }))
                  .sort(sortBySortableId)
              }))
                .sort(sortBySortableId),
              contents: item.contents
                .map(i => ({ ..._.merge(i, i.draftData) }))
                .sort(sortBySortableId),
            }))
            .sort(sortBySortableId)
        }))
        .sort(sortBySortableId)
    };
  } catch (e) {
    return Promise.reject(e);
  }
}

async function _loadSurveyDoc(query) {
  try {
    const { _id, ...$match } = query;

    $match._id = toObjectId(_id);

    const data = await Survey.model
      .aggregate([
        { $match },
        {
          $lookup: {
            from: 'SurveySection',
            as: 'surveySections',
            let: { survey: '$_id' },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ['$survey', '$$survey'] },
                      { $ne: ['$draftRemove', true] }
                    ]
                  }
                }
              },
              {
                $lookup: {
                  from: 'SurveyItem',
                  as: 'surveyItems',
                  let: { surveySection: '$_id' },
                  pipeline: [
                    {
                      $match: {
                        $expr: {
                          $and: [
                            {
                              $or: [
                                { $eq: ['$draftData.surveySection', '$$surveySection'] },
                                {
                                  $and: [
                                    { $eq: ['$surveySection', '$$surveySection'] },
                                    { $eq: [{ $ifNull: ['$draftData.surveySection', true] }, true] }
                                  ]
                                },
                              ]
                            },
                            { $ne: ['$draftRemove', true] },
                            { $ne: ['$inTrash', true] },
                          ]
                        }
                      }
                    },
                    // TODO check and rebuild
                    {
                      $lookup: {
                        from: 'ContentItem',
                        as: 'contents',
                        let: { surveyItem: '$_id' },
                        pipeline: [
                          {
                            $match: {
                              $expr: {
                                $and: [
                                  { $eq: ['$surveyItem', '$$surveyItem'] },
                                  { $ne: ['$draftRemove', true] },
                                  { $ne: ['$inTrash', true] }
                                ]
                              }
                            }
                          },
                        ]
                      }
                    },
                    {
                      $lookup: {
                        from: 'Question',
                        as: 'question',
                        let: { question: '$question' },
                        pipeline: [
                          {
                            $match: {
                              $expr: {
                                $and: [
                                  { $eq: ['$_id', '$$question'] },
                                  { $ne: ['$draftRemove', true] },
                                  { $ne: ['$inTrash', true] }
                                ]
                              }
                            }
                          },
                          {
                            $lookup: {
                              from: 'QuestionItem',
                              as: 'questionItems',
                              let: { question: '$_id' },
                              pipeline: [
                                {
                                  $match: {
                                    $expr: {
                                      $and: [
                                        { $eq: ['$question', '$$question'] },
                                        { $ne: ['$draftRemove', true] },
                                        { $ne: ['$inTrash', true] }
                                      ]
                                    }
                                  }
                                },
                              ]
                            }
                          },
                          {
                            $lookup: {
                              from: 'GridRow',
                              as: 'gridRows',
                              let: { question: '$_id' },
                              pipeline: [
                                {
                                  $match: {
                                    $expr: {
                                      $and: [
                                        { $eq: ['$question', '$$question'] },
                                        { $ne: ['$draftRemove', true] },
                                        { $ne: ['$inTrash', true] }
                                      ]
                                    }
                                  }
                                },
                              ]
                            }
                          },
                          {
                            $lookup: {
                              from: 'GridColumn',
                              as: 'gridColumns',
                              let: { question: '$_id' },
                              pipeline: [
                                {
                                  $match: {
                                    $expr: {
                                      $and: [
                                        { $eq: ['$question', '$$question'] },
                                        { $ne: ['$draftRemove', true] },
                                        { $ne: ['$inTrash', true] }
                                      ]
                                    }
                                  }
                                },
                              ]
                            }
                          }
                        ]
                      }
                    },
                    {
                      $lookup: {
                        from: 'FlowLogic',
                        as: 'flowLogic',
                        let: { surveyItem: '$_id' },
                        pipeline: [
                          {
                            $match: {
                              $expr: { $eq: ['$surveyItem', '$$surveyItem'] },
                            }
                          },
                          {
                            $lookup: {
                              from: 'FlowItem',
                              as: 'flowItems',
                              localField: '_id',
                              foreignField: 'flowLogic'
                            }
                          }
                        ]
                      }
                    },
                    { $unwind: { path: '$question', preserveNullAndEmptyArrays: true } },
                  ]
                },
              }
            ]
          }
        },
        {
          $lookup: {
            from: 'ContentItem',
            as: 'startPages',
            let: { survey: '$_id' },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ['$survey', '$$survey'] },
                      { $ne: ['$draftRemove', true] },
                      { $ne: ['inTrash', true] },
                      { $eq: ['$type', 'startPage'] }
                    ]
                  }
                }
              }
            ]
          }
        },
        {
          $lookup: {
            from: 'ContentItem',
            as: 'endPages',
            let: { survey: '$_id' },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ['$survey', '$$survey'] },
                      { $ne: ['$draftRemove', true] },
                      { $ne: ['inTrash', true] },
                      { $eq: ['$type', 'endPage'] }
                    ]
                  }
                }
              }
            ]
          }
        }
      ]);

    if (!data.length) return;

    // TODO temporary load surveyTheme outside of aggregate
    data[0].surveyTheme = await SurveyTheme.model.findOne({ survey: _id }).lean();

    return data[0];
  } catch (e) {
    return Promise.reject(e);
  }
}

function sortBySortableId(a, b) {
  return _.get(a, 'draftData.sortableId', a.sortableId) - _.get(b, 'draftData.sortableId', b.sortableId);
}
