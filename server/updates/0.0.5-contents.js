import { Content } from '../models';

export default async function contents(done) {
  try {
    // remove old contents if present
    const contents = await Content.model.find();
    for (const content of contents) {
      await content.remove();
    }

    // create EN content
    await Content.model.create({ name: 'English', nameShort: 'en' });

    // create DE content
    await Content.model.create({ name: 'German', nameShort: 'de' });

    done();
  } catch (e) {
    console.error('Updates error: contents');
    console.error(e);
    done(e);
  }
}
