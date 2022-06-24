// base
import keystone from 'keystone';
import _ from 'lodash';
import httpStatus from 'http-status';

// models
import { TagEntity } from '../../../models';

// helpers
import { initSession } from '../../../helpers/transactions';
import checkPermission from '../../helpers/checkPermission';

/** PUT /api/v1/manage-tags/:type/:id */
async function updateEntity(req, res, next) {
  const { items } = req.body;
  const { id, type } = req.params;
  const session = await initSession();
  try {
    // load right model by type
    const doc = await keystone.lists[_.capitalize(type)].model
      .findById({ _id: id })
      .populate({ path: 'tagEntities', select: 'tag' });

    if (!doc) return res.sendStatus(httpStatus.NOT_FOUND);

    // check permission to update
    if (!checkPermission({ user: req.user, doc })) {
      return res.sendStatus(httpStatus.FORBIDDEN);
    }

    // find existing tags id's from tag entities
    const oldTagsIds = doc.tagEntities.map(tagEntity => tagEntity.tag._id.toString());

    // find difference between old and new tags to remove it
    const diffsToRemove = _.difference(oldTagsIds, items);

    // find difference between new and old tags to create it
    const diffsToCreate = _.difference(items, oldTagsIds);

    await session.withTransaction(async () => {
      // create tag entities based on difference between tags
      for (const diff of diffsToCreate) {
        const tagEntity = new TagEntity.model({
          [type]: id,
          tag: diff,
          company: doc.company,
          isGlobal: req.user.isTemplateMaker
        });
        await tagEntity.save({ session });
      }
    });

    // remove tag entities based on difference between tags
    for (const diff of diffsToRemove) {
      await TagEntity.model.find({ [type]: id, tag: diff }).remove();
    }

    const reloadedDoc = await keystone.lists[_.capitalize(type)].model
      .findById({ _id: id })
      .populate([
        {
          path: 'questionItems',
          select: 'createdAt team name',
          options: { sort: { sortableId: 1 } }
        },
        {
          path: 'team',
          select: 'name',
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
          path: 'createdBy',
          select: 'name',
          match: { isAdmin: { $ne: true } }
        },
        {
          path: 'updatedBy',
          select: 'name',
          match: { isAdmin: { $ne: true } }
        }
      ])
      .lean();

    return res.json(reloadedDoc);
  } catch (e) {
    /* istanbul ignore next */
    return next(e);
  }
}

export default { updateEntity };
