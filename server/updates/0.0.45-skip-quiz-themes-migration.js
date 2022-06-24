import { localizationList } from '../../config/localization';
// helpers
import { initSession } from '../helpers/transactions';

// models
import {
  Survey,
  SurveyTheme,
  SkipItem,
  FlowLogic,
  FlowItem,
  ContentItem
} from '../models';

export default async function skipThemesMigration(done) {
  const session = await initSession();

  try {
    let cursor;

    await session.withTransaction(async () => {
      // MIGRATE SKIP ITEMS TO FLOW LOGIC
      cursor = await SkipItem.model
        .find()
        .cursor();

      for (let skipItem = await cursor.next(); skipItem != null; skipItem = await cursor.next()) {
        const {
          company,
          team,
          sortableId,
          surveyItem,
          type: action,
          questionType,
          action: condition,
          gridRow,
          gridColumn,
          questionItems,
          value,
          count,
          survey,
          toSection: section
        } = skipItem;

        const flowLogic = new FlowLogic.model({
          team,
          company,
          sortableId,
          surveyItem,
          action,
          section,
          method: 'some'
        });

        const flowItem = new FlowItem.model({
          company,
          team,
          survey,
          questionType,
          condition,
          gridRow,
          gridColumn,
          questionItems,
          value,
          count,
          flowLogic: flowLogic._id
        });

        await flowLogic.save({ session });
        await flowItem.save({ session });
        await skipItem.remove({ session });
      }

      // MIGRATE THEMES AND SURVEY QUIZ SETTINGS
      cursor = await Survey.model
        .find()
        .populate('surveyTheme')
        .cursor();

      for (let survey = await cursor.next(); survey != null; survey = await cursor.next()) {
        const { _id, company, team, logo } = survey;

        if (!survey.surveyTheme) {
          // CREATE DEFAULT SURVEY THEME
          const surveyTheme = new SurveyTheme.model({
            company,
            team,
            survey: _id,
            type: 'survey',
          });

          // add logo
          surveyTheme.logo = logo;

          await surveyTheme.save({ session });
        }

        // SET DEFAULT QUIZ SETTINGS
        if (survey.surveyType === 'quiz') survey.showResultText = 'question';

        // MIGRATE ENTRY PAGES
        if (survey.entryPage && survey.entryPage.active) {
          const { html: isHtml, content: html, text } = survey.entryPage;

          const startPage = new ContentItem.model({
            company,
            team,
            text,
            html,
            survey: _id,
            type: 'startPage',
            contentType: isHtml ? 'html' : 'text',
            default: true,
          });

          await startPage.save({ session });
        }

        // MIGRATE END PAGES
        if (survey.endPage && survey.endPage.active) {
          const { html: isHtml, content: html, text } = survey.endPage;

          const endPage = new ContentItem.model({
            company,
            team,
            text,
            html,
            survey: _id,
            type: 'endPage',
            contentType: isHtml ? 'html' : 'text',
            default: true
          });

          await endPage.save({ session });
        }

        // SET DEFAULT LANGUAGE
        survey.defaultLanguage = localizationList.find(lang => survey.translation[lang]);

        await survey.save({ session });
      }
    });

    done();
  } catch (e) {
    console.error('Updates error: survey settings and flow logic migration', e);
    return done(e);
  }
}
