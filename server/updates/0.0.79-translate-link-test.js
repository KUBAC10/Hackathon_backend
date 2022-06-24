import { ContentItem } from '../models';

export default async function translateLinkText(done) {
  try {
    const contentItems = await ContentItem.model
      .find({ type: 'endPage', 'externalLinks.linkText': { $exists: true } })
      .populate({ path: 'survey', select: 'defaultLanguage' })
      .select('survey externalLinks');


    for (const contentItem of contentItems) {
      const { survey: { defaultLanguage }, externalLinks = [] } = contentItem;

      contentItem.externalLinks = externalLinks.map((item) => {
        if (item.linkText) item.linkText = { [defaultLanguage]: item.linkText };

        return item;
      });

      await contentItem.save();
    }

    done();
  } catch (e) {
    done(e);
  }
}
