import { Content } from '../models';

export default async function frenchContent(done) {
  try {
    const frLang = await Content.model.findOne({ nameShort: 'fr' }).lean();

    // if lang is not present - create it
    if (!frLang) await Content.model.create({ name: 'Français', nameShort: 'fr' });

    done();
  } catch (e) {
    console.error('Updates error: init french language');
    console.error(e);
    done(e);
  }
}
