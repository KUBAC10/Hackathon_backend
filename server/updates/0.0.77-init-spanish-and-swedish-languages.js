import { Content } from '../models';

export default async function initSpanishAndSwedishLanguage(done) {
  try {
    const esLang = await Content.model.findOne({ nameShort: 'es' }).lean();

    // if lang is not present - create it
    if (!esLang) await Content.model.create({ name: 'Spanish', nameShort: 'es' });

    const svLang = await Content.model.findOne({ nameShort: 'sv' }).lean();

    // if lang is not present - create it
    if (!svLang) await Content.model.create({ name: 'Swedish', nameShort: 'sv' });

    done();
  } catch (e) {
    console.error('Updates error: init spanish and swedish languages');
    console.error(e);
    done(e);
  }
}
