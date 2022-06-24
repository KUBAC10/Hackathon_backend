// models
import {
  Tag,
  TagEntity
} from '../../models/index';

export default async function searchByTag(options = {}) {
  const { scopes, tagName, entity } = options;
  const company = scopes.company;
  const searchQuery = { name: { $regex: tagName, $options: 'i' }, company };
  if (scopes.team) searchQuery.team = scopes.team;
  const tags = await Tag.model.find(searchQuery).lean();
  // get all tag entities
  const tagEntities = await TagEntity.model
    .find({
      company,
      tag: { $in: tags.map(i => i._id.toString()) },
      [entity]: { $exists: true }
    }).lean();
  // return array of entity IDs
  return { $in: tagEntities.map(i => i[entity].toString()) };
}
