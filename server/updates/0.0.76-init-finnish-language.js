import { Content } from '../models';

export default async function finnishContent(done) {
  try {
    const fiLang = await Content.model.findOne({ nameShort: 'fi' }).lean();

    // if lang is not present - create it
    if (!fiLang) await Content.model.create({ name: 'Finnish', nameShort: 'fi' });

    done();
  } catch (e) {
    console.error('Updates error: init finnish language');
    console.error(e);
    done(e);
  }
}
