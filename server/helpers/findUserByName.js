import { User } from '../models';

export default async function findUsersByName(name) {
  const splitedName = name.split(' ');
  const query = {};
  query.$or = query.$or || [];
  splitedName.forEach((item) => {
    query.$or.push({ 'name.first': { $regex: item, $options: 'i' } });
    query.$or.push({ 'name.last': { $regex: item, $options: 'i' } });
  });
  return await User.model.find(query);
}
