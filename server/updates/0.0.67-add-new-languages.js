import { Content } from '../models';

export default async function addNewLanguages(done) {
  try {
    const langs = [
      { name: 'Romanian', nameShort: 'ro' },
      { name: 'Danish', nameShort: 'da' },
      { name: 'Portuguese', nameShort: 'pt' },
      { name: 'Czech', nameShort: 'cs' },
      { name: 'Hungarian', nameShort: 'hu' }
    ];

    for (const lang of langs) {
      const langDoc = await Content.model.findOne({ nameShort: lang.nameShort }).lean();

      // if lang is not present - create it
      if (!langDoc) {
        await Content.model.create({ name: lang.name, nameShort: lang.nameShort });
      }
    }

    done();
  } catch (e) {
    console.error('Updates error: init languages');
    console.error(e);
    done(e);
  }
}
