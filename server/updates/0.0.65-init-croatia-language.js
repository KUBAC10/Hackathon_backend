import { Content } from '../models';

export default async function croatianContent(done) {
  try {
    const hrLang = await Content.model.findOne({ nameShort: 'hr' }).lean();

    // if lang is not present - create it
    if (!hrLang) await Content.model.create({ name: 'Croatian', nameShort: 'hr' });

    done();
  } catch (e) {
    console.error('Updates error: init croatian language');
    console.error(e);
    done(e);
  }
}
