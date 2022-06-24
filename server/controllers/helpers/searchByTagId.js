// models
import { TagEntity } from '../../models/index';

export default async function searchByTagId(options = {}) {
  const { scopes: { company }, tagId, entity } = options;

  // find tag entities
  const tagEntities = await TagEntity.model
    .find({
      $or: [{ company }, { isGlobal: true }],
      tag: tagId,
      [entity]: { $exists: true }
    })
    .lean();

  // return array of entity IDs
  return { $in: tagEntities.map(i => i[entity].toString()) };
}
