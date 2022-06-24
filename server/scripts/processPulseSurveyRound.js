import processPulseSurveyRound from '../cron/processPulseSurveyRound';

export default async function (session, next) {
  try {
    await processPulseSurveyRound();
  } catch (e) {
    next(e);
  }
}
