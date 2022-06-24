import { Content } from '../models';

export default async function dutchContent(done) {
  try {
    const nlLang = await Content.model.findOne({ nameShort: 'nl' }).lean();

    // if lang is not present - create it
    if (!nlLang) await Content.model.create({ name: 'Dutch', nameShort: 'nl' });

    done();
  } catch (e) {
    console.error('Updates error: init russian language');
    console.error(e);
    done(e);
  }
}
