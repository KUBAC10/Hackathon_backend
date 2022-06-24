export default async function saveAnswersInSurveyResult(done) {
  try {
    done();
  } catch (e) {
    console.error('Updates error: 0.0.39 set answers in surveyResults', e);
    done(e);
  }
}
