import mongoose from 'mongoose';
import async from 'async';
import _ from 'lodash';

// models
import {
  PulseSurveyDriver,
  Survey,
  SurveyItem,
  SurveySection
} from '../../models';

// helpers
import applyDraftData from '../../helpers/applyDraftData';

const toObjectId = mongoose.Types.ObjectId;

const surveyItemPipeline = [
  {
    $lookup: {
      from: 'Question',
      as: 'question',
      let: { question: '$question' },
      pipeline: [
        {
          $match: {
            $expr: {
              $eq: ['$_id', '$$question']
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
              }
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
              }
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
              }
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
            $expr: {
              $and: [
                { $eq: ['$surveyItem', '$$surveyItem'] },
                { $ne: ['$draftRemove', true] }
              ]
            },
          }
        },
        {
          $lookup: {
            from: 'FlowItem',
            as: 'flowItems',
            let: { flowLogic: '$_id' },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ['$flowLogic', '$$flowLogic'] },
                      { $ne: ['$draftRemove', true] }
                    ]
                  },
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
      from: 'DisplayLogic',
      as: 'displayLogic',
      let: { surveyItem: '$_id' },
      pipeline: [
        {
          $match: {
            $expr: {
              $and: [
                { $eq: ['$surveyItem', '$$surveyItem'] },
                { $ne: ['$draftRemove', true] }
              ]
            }
          }
        },
        {
          $lookup: {
            from: 'FlowItem',
            as: 'flowItems',
            let: { displayLogic: '$_id' },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ['$displayLogic', '$$displayLogic'] },
                      { $ne: ['$draftRemove', true] }
                    ]
                  }
                }
              }
            ]
          }
        }
      ]
    }
  },
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
                {
                  $or: [
                    { $eq: ['$draftData.surveyItem', '$$surveyItem'] },
                    {
                      $and: [
                        { $eq: ['$surveyItem', '$$surveyItem'] },
                        { $eq: [{ $ifNull: ['$draftData.surveyItem', true] }, true] }
                      ]
                    },
                  ]
                },
                { $ne: ['$draftRemove', true] },
                { $ne: ['$inTrash', true] },
              ]
            }
          }
        }
      ]
    }
  },
  { $unwind: { path: '$question', preserveNullAndEmptyArrays: true } }
];

async function loadDraftSurvey(query) {
  try {
    const doc = await _loadSurveyDoc(query);

    if (!doc) return;

    return {
      ..._.mergeWith(doc, doc.draftData, (objValue, srcValue) => {
        if (_.isArray(srcValue)) return srcValue;
      }),
      startPages: doc.startPages
        .map(startPage => ({ ..._.merge(startPage, startPage.draftData) }))
        .sort(sortBySortableId),
      endPages: doc.endPages
        .map(endPage => ({
          ..._.merge(endPage, endPage.draftData),
          flowItem: _.merge(
            _.get(endPage, 'flowItem'),
            _.get(endPage, 'flowItem.draftData')
          ),
          contentItemElements: endPage.contentItemElements
            .map(element => ({ ..._.merge(element, element.draftData) }))
        }))
        .sort(sortBySortableId),
      surveySections: doc.surveySections
        .map(section => ({
          ..._.merge(section, section.draftData),
          surveyItems: section.surveyItems
            .map(_surveyItemHandler)
            .sort(sortBySortableId),
          pulseSurveyDriver: _.merge(
            _.get(section, 'pulseSurveyDriver'),
            _.get(section, 'pulseSurveyDriver.draftData')
          )
        }))
        .sort(sortBySortableId),
      pulseSurveyDrivers: doc.pulseSurveyDrivers
        .map(driver => ({ ..._.merge(driver, driver.draftData) }))
        .sort(sortBySortableId)
    };
  } catch (e) {
    return Promise.reject(e);
  }
}

async function loadDraftSurveySection(surveySectionId) {
  try {
    const data = await SurveySection.model.aggregate([
      {
        $match: {
          _id: toObjectId(surveySectionId)
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
            ...surveyItemPipeline
          ]
        },
      }
    ]);

    if (!data.length) return;

    const [section] = data;

    return {
      ..._.merge(section, section.draftData),
      surveyItems: section.surveyItems
        .map(_surveyItemHandler)
        .sort(sortBySortableId)
    };
  } catch (e) {
    return Promise.reject(e);
  }
}

async function loadPreviewSurveySections(surveyId, pulse = false, pulseSurveyRoundResult) {
  try {
    let step = 0;
    let surveyItemsMatch = [];
    let basePipeline;
    let surveySectionsMatch;

    // match survey items by pulseSurveyRoundResult surveyItemsMap if presented
    if (pulseSurveyRoundResult) {
      const { surveyItemsMap = {} } = pulseSurveyRoundResult;

      const surveyItemsIds = Object.keys(surveyItemsMap);

      if (surveyItemsIds.length) {
        // set surveyItems map match
        surveyItemsMatch = surveyItemsIds.map(toObjectId);

        // load survey sections ids from surveyItems and build match function
        const surveyItems = await SurveyItem
          .model
          .find({ _id: { $in: surveyItemsIds } });
        const surveySectionIds = surveyItems
          .map(i => (i.draftData || {}).surveySection || i.surveySection);
        surveySectionsMatch = { _id: { $in: surveySectionIds } };
      }
    }

    // if match object is not present - build it from active privers and sections
    if (!surveySectionsMatch && pulse) {
      const activeDrivers = await PulseSurveyDriver
        .model
        .find({
          survey: toObjectId(surveyId),
          draftRemove: { $ne: true },
          $or: [{ active: true }, { 'draftData.active': true }] // TODO check condition
        });

      surveySectionsMatch =
        {
          pulseSurveyDriver: { $in: activeDrivers.map(i => i._id) },
          survey: toObjectId(surveyId),
          draftRemove: { $ne: true },
          hide: { $ne: true },
          'draftData.hide': { $ne: true }
        };
    }

    // build basePipeline config
    if (pulse) {
      basePipeline = [
        { $match: surveySectionsMatch },
        { $sample: { size: 10 } }, // limit sections loading to 10 on preview
      ];
    } else {
      // survey and quiz
      basePipeline = [
        {
          $match: {
            $expr: {
              $and: [
                { $eq: ['$survey', toObjectId(surveyId)] },
                { $ne: ['$draftRemove', true] },
                { $ne: ['$hide', true] },
                { $ne: ['$draftData.hide', true] }
              ]
            }
          }
        }
      ];
    }

    const data = await SurveySection.model.aggregate([
      ...basePipeline,
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
                        }
                      ]
                    },
                    { $ne: ['$draftRemove', true] },
                    { $ne: ['$inTrash', true] },
                    { $ne: ['$hide', true] },
                    { $ne: ['$draftData.hide', true] },
                    ...surveyItemsMatch.length ? [{ $in: ['$_id', surveyItemsMatch] }] : []
                  ]
                }
              }
            },
            ...surveyItemPipeline
          ]
        }
      }
    ]);

    let surveySections = data
      .map(section => ({
        ..._.merge(section, section.draftData),
        surveyItems: section.surveyItems
          .map(_surveyItemHandler)
          .sort(sortBySortableId)
          .filter(item => !item.hide)
      }))
      .sort(sortBySortableId);

    // filter sections by hidden drivers
    if (pulse) {
      const drivers = await PulseSurveyDriver.model
        .find({ survey: surveyId })
        .lean();

      drivers.forEach(applyDraftData);

      const driverIds = drivers
        .filter(driver => !!driver.active)
        .map(driver => driver._id.toString());

      surveySections = surveySections
        .filter(section => driverIds.includes(section.pulseSurveyDriver.toString()))
        .filter(section => section.surveyItems && section.surveyItems.length);
    }

    surveySections = surveySections
      .filter(section => !section.hide)
      .map((s) => {
        s.step = step;

        step += 1;

        s.surveyItems = s.surveyItems
          .map((item, index) => {
            item.step = index;

            // randomize question items
            if (_.get(item, 'question.randomize')) {
              const questionItems = _.get(item, 'question.questionItems', []);

              _.set(item, 'question.questionItems', _.shuffle(questionItems));
            }

            return item;
          })
          .filter(item => !item.hide);

        return s;
      });

    return surveySections;
  } catch (e) {
    return Promise.reject(e);
  }
}

async function loadDraftSurveyItem(query) {
  try {
    const doc = await _loadSurveyItemDoc(query);

    return _surveyItemHandler(doc);
  } catch (e) {
    return Promise.reject(e);
  }
}

// async function _loadSurveyDoc(query) {
//   try {
//     const { _id, ...$match } = query;
//
//     $match._id = toObjectId(_id);
//
//     // TODO REWRITE AGGREGATE TO NORMAL CALLS
//     const data = await Survey.model
//       .aggregate([
//         { $match },
//         {
//           $lookup: {
//             from: 'SurveySection',
//             as: 'surveySections',
//             let: { survey: '$_id' },
//             pipeline: [
//               {
//                 $match: {
//                   $expr: {
//                     $and: [
//                       { $eq: ['$survey', '$$survey'] },
//                       { $ne: ['$draftRemove', true] }
//                     ]
//                   }
//                 }
//               },
//               {
//                 $lookup: {
//                   from: 'SurveyItem',
//                   as: 'surveyItems',
//                   let: { surveySection: '$_id' },
//                   pipeline: [
//                     {
//                       $match: {
//                         $expr: {
//                           $and: [
//                             {
//                               $or: [
//                                 { $eq: ['$draftData.surveySection', '$$surveySection'] },
//                                 {
//                                   $and: [
//                                     { $eq: ['$surveySection', '$$surveySection'] },
//                         { $eq: [{ $ifNull: ['$draftData.surveySection', true] }, true] }
//                                   ]
//                                 },
//                               ]
//                             },
//                             { $ne: ['$draftRemove', true] },
//                             { $ne: ['$inTrash', true] },
//                           ]
//                         }
//                       }
//                     },
//                     ...surveyItemPipeline
//                   ]
//                 }
//               },
//               {
//                 $lookup: {
//                   from: 'PulseSurveyDriver',
//                   as: 'pulseSurveyDriver',
//                   let: {
//                     pulseSurveyDriver: '$pulseSurveyDriver',
//                     draftPulseSurveyDriver: { $toObjectId: '$draftData.pulseSurveyDriver' }
//                   },
//                   pipeline: [
//                     {
//                       $match: {
//                         $expr: {
//                           $or: [
//                             { $eq: ['$$draftPulseSurveyDriver', '$_id'] },
//                             {
//                               $and: [
//                                 { $eq: ['$$pulseSurveyDriver', '$_id'] },
//                                 { $eq: [{ $ifNull: ['$$draftPulseSurveyDriver', true] }, true] }
//                               ]
//                             }
//                           ]
//                         }
//                       }
//                     }
//                   ]
//                 }
//               },
//               { $unwind: { path: '$pulseSurveyDriver', preserveNullAndEmptyArrays: true } }
//             ]
//           }
//         },
//         {
//           $lookup: {
//             from: 'ContentItem',
//             as: 'startPages',
//             let: { survey: '$_id' },
//             pipeline: [
//               {
//                 $match: {
//                   $expr: {
//                     $and: [
//                       { $eq: ['$survey', '$$survey'] },
//                       { $ne: ['$draftRemove', true] },
//                       { $ne: ['inTrash', true] },
//                       { $eq: ['$type', 'startPage'] }
//                     ]
//                   }
//                 }
//               }
//             ]
//           }
//         },
//         {
//           $lookup: {
//             from: 'ContentItem',
//             as: 'endPages',
//             let: { survey: '$_id' },
//             pipeline: [
//               {
//                 $match: {
//                   $expr: {
//                     $and: [
//                       { $eq: ['$survey', '$$survey'] },
//                       { $ne: ['$draftRemove', true] },
//                       { $ne: ['inTrash', true] },
//                       { $eq: ['$type', 'endPage'] }
//                     ]
//                   }
//                 }
//               },
//               {
//                 $lookup: {
//                   from: 'FlowItem',
//                   as: 'flowItem',
//                   let: { endPageId: '$_id' },
//                   pipeline: [
//                     {
//                       $match: {
//                         $expr: {
//                           $and: [
//                             { $eq: ['$endPage', '$$endPageId'] },
//                             { $ne: ['$draftRemove', true] },
//                             { $eq: ['$questionType', 'endPage'] }
//                           ]
//                         }
//                       }
//                     }
//                   ]
//                 }
//               },
//               { $unwind: { path: '$flowItem', preserveNullAndEmptyArrays: true } }
//             ]
//           }
//         },
//         {
//           $lookup: {
//             from: 'PulseSurveyDriver',
//             as: 'pulseSurveyDrivers',
//             let: { survey: '$_id' },
//             pipeline: [
//               {
//                 $match: {
//                   $expr: {
//                     $and: [
//                       { $eq: ['$survey', '$$survey'] },
//                       { $ne: ['$draftRemove', true] }
//                     ]
//                   }
//                 }
//               },
//               {
//                 $sort: { sortableId: 1 }
//               }
//             ]
//           }
//         }
//       ]);
//
//     if (!data.length) return;
//
//     // TODO temporary load surveyTheme outside of aggregate
//     const surveyTheme = await SurveyTheme.model.findOne({ survey: _id })
//       .lean();
//
//     if (surveyTheme) data[0].surveyTheme = _.merge(surveyTheme, surveyTheme.draftData);
//
//     return data[0];
//   } catch (e) {
//     return Promise.reject(e);
//   }
// }

async function _loadSurveyDoc(query) {
  try {
    const survey = await Survey.model
      .findOne(query)
      .populate([
        {
          path: 'surveySections',
          match: { draftRemove: { $ne: true } }
        },
        {
          path: 'startPages',
          match: {
            draftRemove: { $ne: true },
            inTrash: { $ne: true },
            type: 'startPage',
          }
        },
        {
          path: 'endPages',
          match: {
            draftRemove: { $ne: true },
            type: 'endPage',
          },
          populate: [
            {
              path: 'flowItem',
              match: { draftRemove: { $ne: true } }
            },
            {
              path: 'contentItemElements',
              match: { draftRemove: { $ne: true } }
            }
          ]
        },
        {
          path: 'pulseSurveyDrivers',
          match: { draftRemove: { $ne: true } }
        },
        {
          path: 'surveyTheme'
        }
      ])
      .lean();

    if (!survey) return;

    const { surveySections = [] } = survey;

    await async.eachLimit(surveySections, 5, (section, cb) => {
      Promise.all([
        SurveyItem.model.aggregate([
          {
            $match: {
              survey: survey._id,
              inTrash: { $ne: true },
              draftRemove: { $ne: true },
              $or: [
                { 'draftData.surveySection': section._id },
                {
                  surveySection: section._id,
                  'draftData.surveySection': { $exists: false }
                }
              ]
            }
          },
          ...surveyItemPipeline
        ]),
        PulseSurveyDriver.model.findOne({
          _id: _.get(section, 'draftData.pulseSurveyDriver', section.pulseSurveyDriver),
          draftRemove: { $ne: true }
        }).lean()
      ])
        .then(([surveyItems, pulseSurveyDriver]) => {
          section.surveyItems = surveyItems;
          section.pulseSurveyDriver = pulseSurveyDriver;

          cb();
        })
        .catch(cb);
    });

    return survey;
  } catch (e) {
    return Promise.reject(e);
  }
}

async function _loadSurveyItemDoc(query) {
  try {
    const { _id, ...$match } = query;

    $match._id = toObjectId(_id);

    const data = await SurveyItem.model
      .aggregate([
        { $match },
        ...surveyItemPipeline
      ]);

    if (!data.length) return;

    return data[0];
  } catch (e) {
    return Promise.reject(e);
  }
}

function _surveyItemHandler(item) {
  return {
    ..._.merge(item, item.draftData, (objValue, srcValue) => {
      if (_.isArray(srcValue)) return srcValue;
    }),
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
    flowLogic: item.flowLogic
      .map(logic => ({
        ..._.merge(logic, logic.draftData),
        flowItems: logic.flowItems
          .map(i => ({
            ..._.mergeWith(i, i.draftData, (objValue, srcValue) => {
              if (_.isArray(srcValue)) return srcValue;
            })
          }))
          .sort(sortBySortableId)
      }))
      .sort(sortBySortableId),
    displayLogic: item.displayLogic
      .map(logic => ({
        ..._.merge(logic, logic.draftData),
        flowItems: logic.flowItems
          .map(i => ({
            ..._.mergeWith(i, i.draftData, (objValue, srcValue) => {
              if (_.isArray(srcValue)) return srcValue;
            })
          }))
          .sort(sortBySortableId)
      }))
      .sort(sortBySortableId),
    contents: item.contents
      .map(i => ({ ..._.merge(i, i.draftData) }))
      .sort(sortBySortableId)
  };
}

function sortBySortableId(a, b) {
  return _.get(a, 'draftData.sortableId', a.sortableId) - _.get(b, 'draftData.sortableId', b.sortableId);
}

export default {
  loadDraftSurvey,
  loadDraftSurveySection,
  loadPreviewSurveySections,
  loadDraftSurveyItem,
  sortBySortableId
};
