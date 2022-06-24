import { Contact } from '../models';

export default async function findContactByName(name, scopes) {
  try {
    const query = { ...scopes, $or: [] };

    name.split(' ').forEach((item) => {
      query.$or.push({ 'name.first': { $regex: item, $options: 'i' } });
      query.$or.push({ 'name.last': { $regex: item, $options: 'i' } });
    });

    const contacts = await Contact.model
      .find(query)
      .select('_id')
      .lean();

    return contacts.map(i => i._id);
  } catch (e) {
    return Promise.reject(e);
  }
}
