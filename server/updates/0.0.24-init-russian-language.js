import { Content } from '../models';

export default async function russianContent(done) {
  try {
    const ruLang = await Content.model.findOne({ nameShort: 'ru' }).lean();

    // if lang is not present - create it
    if (!ruLang) await Content.model.create({ name: 'Russian', nameShort: 'ru' });

    done();
  } catch (e) {
    console.error('Updates error: init russian language');
    console.error(e);
    done(e);
  }
}
