// helpers
import { initSession } from '../helpers/transactions';

// models
import {
  QuizEndPage,
  ContentItem,
  FlowItem
} from '../models';

export default async function setStepToSections(done) {
  const session = await initSession();

  try {
    const cursor = await QuizEndPage.model
      .find()
      .populate({ path: 'survey', select: '_id company team' })
      .lean()
      .cursor();

    await session.withTransaction(async () => {
      for (let quiz = await cursor.next(); quiz != null; quiz = await cursor.next()) {
        if (quiz.survey) {
          const { survey, minScore, maxScore, text = {}, content = {}, html } = quiz;
          const { company, team } = survey;

          // find default end page to related survey
          const surveyDefaultEndPage = await ContentItem.model
            .findOne({ survey, type: 'endPage', default: true })
            .select('_id')
            .lean();

          const endPage = ContentItem.model({
            company,
            team,
            survey,
            text,
            html: content,
            type: 'endPage',
            contentType: html ? 'html' : 'text',
            default: !surveyDefaultEndPage
          });

          const flowItem = new FlowItem.model({
            company,
            team,
            survey,
            endPage,
            questionType: 'endPage',
            condition: 'range',
            range: {
              from: minScore,
              to: maxScore,
            }
          });

          await endPage.save({ session });
          await flowItem.save({ session });
        }
      }
    });

    done();
  } catch (e) {
    console.error('Updates error: ste step to sections', e);
    return done(e);
  }
}
