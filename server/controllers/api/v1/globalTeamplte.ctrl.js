import httpStatus from 'http-status';

// models
import { Survey } from '../../../models';

// helpers
import parseSingleDateToRange from '../../../helpers/parseSingleDateToRange';
import collationParser from '../../../helpers/collationParser';
import multiLangSearchBuilder from '../../../helpers/multiLangSearchBuilder';

import config from '../../../../config/env';

const select = 'surveyType surveyInvitationMailer surveyCompleteMailer createdAt description updatedAt totalInvites lastAnswerDate totalResults totalCompleted name translation team active publicAccess urlName startDate endDate localization translationLockName translationLockDescription footer logo';

/** GET /api/v1/global-templates - List of global templates*/
async function list(req, res, next) {
  try {
    const { skip, limit, name, createdAt, updatedAt, sort } = req.query;
    const { lang, timeZone = config.timezone } = req.cookies;
    const query = { createdBy: req.user._id, type: 'template', inTrash: { $ne: true } };

    // handle query
    if (name) {
      query.$or = multiLangSearchBuilder('name', name);
    }
    if (createdAt) query.createdAt = parseSingleDateToRange(createdAt, timeZone);
    if (updatedAt) query.updatedAt = parseSingleDateToRange(updatedAt, timeZone);

    // find resources and total
    const [resources, total] = await Promise.all([
      Survey.model.find(query, select)
        .collation(collationParser(lang))
        .lean()
        .sort(sort || { createdAt: -1 })
        .skip(parseInt(skip, 10))
        .limit(parseInt(limit, 10)),
      Survey.model.find(query, '_id').lean().countDocuments()
    ]);

    return res.send({ resources, total });
  } catch (e) {
    /* istanbul ignore next */
    return next(e);
  }
}

/** GET /api/v1/global-templates/:id - Show global template */
async function show(req, res, next) {
  const { id } = req.params;
  const query = { _id: id, createdBy: req.user._id };

  try {
    const doc = await Survey.model
      .findOne(query, 'surveyType createdAt description updatedAt name translation team localization translationLockName translationLockDescription')
      .populate([
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
          select: 'name urlName',
        },
        {
          path: 'surveySections',
          select: 'surveyItems name description translationLockName translationLockDescription sortableId displaySingle',
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
                  ],
                },
                {
                  path: 'notificationMailer.mailer',
                  select: 'name'
                }
              ]
            }
          ]
        },
        {
          path: 'tagEntities',
          select: '-createdBy -updatedAt -updatedBy -__v',
          populate: [
            {
              path: 'tag',
              select: 'createdAt name description'
            }
          ]
        }
      ])
      .lean();

    if (!doc) res.sendStatus(httpStatus.NOT_FOUND);

    return res.json(doc);
  } catch (e) {
    /* istanbul ignore next */
    return next(e);
  }
}

export default {
  list,
  show
};
