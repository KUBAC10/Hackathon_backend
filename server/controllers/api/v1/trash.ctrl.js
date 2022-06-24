import httpStatus from 'http-status';
import _ from 'lodash';

// models
import {
  Trash,
  Survey,
  ContentItem
} from '../../../models';

// helpers
import { initSession } from '../../../helpers/transactions';
import { loadDraftSurveyItem } from '../../helpers/draftLoaders';
import { handleScopes, hasAccess } from '../../helpers';

/** POST /api/v1/trash/clear - clear trash items by ids */
async function clear(req, res, next) {
  const session = await initSession();

  try {
    const { ids } = req.body;

    await session.withTransaction(async () => {
      const trashRecords = await Trash.model.find({ _id: { $in: ids }, ...req.scopes });

      for (const trashRecord of trashRecords) {
        trashRecord.stage = 'clearing';

        await trashRecord.save({ session });
      }
    });

    return res.sendStatus(httpStatus.OK);
  } catch (e) {
    return next(e);
  }
}

/** POST /api/v1/trash/:id/restore - restore trash item */
async function restore(req, res, next) {
  try {
    const { id } = req.params;

    const query = { _id: id };

    const trashRecord = await Trash.model.findOne(query);

    if (!trashRecord) return res.sendStatus(httpStatus.NOT_FOUND);

    if (!hasAccess(trashRecord, req.scopes)) return res.sendStatus(httpStatus.FORBIDDEN);

    await trashRecord.restore();

    let surveyItem;
    let contentItem;

    if (trashRecord.type === 'surveyItem') {
      surveyItem = await loadDraftSurveyItem({ _id: trashRecord.surveyItem });
    }

    if (trashRecord.type === 'contentItem') {
      const data = await ContentItem.model
        .aggregate([
          { $match: { _id: trashRecord.contentItem } },
          {
            $lookup: {
              from: 'SurveyItem',
              as: 'surveyItem',
              let: { surveyItemId: '$surveyItem', draftSurveyItemId: '$draftData.surveyItem' },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $and: [
                        {
                          $or: [
                            { $eq: ['$$draftSurveyItemId', '$_id'] },
                            {
                              $and: [
                                { $eq: ['$_id', '$$surveyItemId'] },
                                { $eq: [{ $ifNull: ['$$draftSurveyItemId', true] }, true] }
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
          { $unwind: { path: '$surveyItem', preserveNullAndEmptyArrays: true } }
        ]);

      if (data.length) {
        contentItem = data[0];

        surveyItem = _.merge(contentItem.surveyItem, _.get(contentItem.surveyItem, 'draftData'));
        surveyItem.contents = [_.merge(contentItem, contentItem.draftData)];
        surveyItem.contents[0].surveyItem = surveyItem._id;
      }
    }

    return res.status(httpStatus.OK).send(surveyItem);
  } catch (e) {
    return next(e);
  }
}

/** GET /api/v1/trash/drafts/:id - list of draft trashes */
async function draftTrash(req, res, next) {
  try {
    const { id } = req.params;
    const { skip: $skip = 0, limit: $limit, stage } = req.query;
    const draftQuery = { _id: id, inTrash: { $ne: true } };

    const draft = await Survey.model.findOne(draftQuery).select('_id company team').lean();

    if (!draft) return res.sendStatus(httpStatus.NOT_FOUND);

    if (!hasAccess(draft, req.scopes)) return res.sendStatus(httpStatus.FORBIDDEN);

    const trashQuery = { stage, draft: draft._id, type: { $in: ['surveyItem', 'contentItem'] } };

    handleScopes({ reqScopes: req.scopes, query: trashQuery });

    const [
      rawResources,
      total
    ] = await Promise.all([
      Trash.model
        .aggregate([
          { $match: trashQuery },
          {
            $lookup: {
              from: 'SurveyItem',
              as: 'surveyItem',
              let: { surveyItemId: '$surveyItem' },
              pipeline: [
                {
                  $match: { $expr: { $eq: ['$_id', '$$surveyItemId'] } }
                },
                {
                  $lookup: {
                    from: 'SurveySection',
                    as: 'surveySection',
                    let: { sectionId: '$surveySection', draftDataSectionId: '$draftData.surveySection' },
                    pipeline: [
                      {
                        $match: {
                          $expr: {
                            $or: [
                              { $eq: ['$_id', '$$draftDataSectionId'] },
                              {
                                $and: [
                                  { $eq: ['$_id', '$$sectionId'] },
                                  { $eq: [{ $ifNull: ['$$draftDataSectionId', true] }, true] }
                                ]
                              }
                            ]
                          }
                        }
                      }
                    ]
                  }
                },
                {
                  $lookup: {
                    from: 'Question',
                    as: 'question',
                    let: { questionId: '$question', draftDataQuestionId: '$draftData.question' },
                    pipeline: [
                      {
                        $match: {
                          $expr: {
                            $or: [
                              { $eq: ['$_id', '$$draftDataQuestionId'] },
                              {
                                $and: [
                                  { $eq: ['$_id', '$$questionId'] },
                                  { $eq: [{ $ifNull: ['$$draftDataQuestionId', true] }, true] }
                                ]
                              }
                            ]
                          }
                        }
                      }
                    ]
                  }
                },
                { $unwind: { path: '$surveySection', preserveNullAndEmptyArrays: true } },
                { $unwind: { path: '$question', preserveNullAndEmptyArrays: true } },
              ]
            }
          },
          {
            $lookup: {
              from: 'ContentItem',
              as: 'contentItem',
              let: { contentItemId: '$contentItem' },
              pipeline: [
                {
                  $match: { $expr: { $eq: ['$_id', '$$contentItemId'] } }
                },
                {
                  $lookup: {
                    from: 'SurveyItem',
                    as: 'surveyItem',
                    let: { surveyItemId: '$surveyItem', draftDataSurveyItemId: '$draftData.surveyItem' },
                    pipeline: [
                      {
                        $match: {
                          $expr: {
                            $or: [
                              { $eq: ['$_id', '$$draftDataSurveyItemId'] },
                              {
                                $and: [
                                  { $eq: ['$_id', '$$surveyItemId'] },
                                  { $eq: [{ $ifNull: ['$$draftDataSurveyItemId', true] }, true] }
                                ]
                              }
                            ]
                          }
                        }
                      },
                      {
                        $lookup: {
                          from: 'SurveySection',
                          as: 'surveySection',
                          let: { sectionId: '$surveySection', draftDataSectionId: '$draftData.surveySection' },
                          pipeline: [
                            {
                              $match: {
                                $expr: {
                                  $or: [
                                    { $eq: ['$_id', '$$draftDataSectionId'] },
                                    {
                                      $and: [
                                        { $eq: ['$_id', '$$sectionId'] },
                                        { $eq: [{ $ifNull: ['$$draftDataSectionId', true] }, true] }
                                      ]
                                    }
                                  ]
                                }
                              }
                            }
                          ]
                        }
                      },
                      { $unwind: { path: '$surveySection', preserveNullAndEmptyArrays: true } },
                    ]
                  }
                },
                { $unwind: { path: '$surveyItem', preserveNullAndEmptyArrays: true } },
              ]

            }
          },
          { $unwind: { path: '$surveyItem', preserveNullAndEmptyArrays: true } },
          { $unwind: { path: '$contentItem', preserveNullAndEmptyArrays: true } },
          { $sort: { createdAt: 1 } },
          { $skip },
          { $limit }
        ]),
      Trash.model
        .find(trashQuery)
        .countDocuments()
    ]);

    const resources = rawResources.reduce((acc, trash) => {
      switch (trash.type) {
        case 'surveyItem': {
          _mergeDraftData(trash, 'surveyItem', ['question', 'surveySection']);
          _mergeDraftData(trash, 'surveyItem.question');
          _mergeDraftData(trash, 'surveyItem.surveySection');

          return _.concat(acc, trash);
        }
        case 'contentItem': {
          _mergeDraftData(trash, 'contentItem', 'surveyItem');
          _mergeDraftData(trash, 'contentItem.surveyItem', 'surveySection');
          _mergeDraftData(trash, 'contentItem.surveyItem.surveySection');

          return _.concat(acc, trash);
        }
        default: return acc;
      }
    }, []);

    return res.send({ resources, total });
  } catch (e) {
    return next(e);
  }
}

function _mergeDraftData(doc, key, omit) {
  _.merge(
    _.get(doc, key),
    _.omit(_.get(doc, `${key}.draftData`), omit)
  );
}

export default {
  clear,
  restore,
  draftTrash
};
