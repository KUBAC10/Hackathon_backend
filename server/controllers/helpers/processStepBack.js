import _ from 'lodash';

// adjust result stepHistory and questionStepHistory
// return next section
export default function processStepBack({ survey, surveyResult }) {
  const { surveySections, displaySingleQuestion } = survey;
  const { stepHistory, questionStepHistory, step } = surveyResult;

  // for display single question - need to find right section
  if (displaySingleQuestion) {
    let prevSurveyItem = questionStepHistory[questionStepHistory.length - 2];
    if (!prevSurveyItem) prevSurveyItem = _.last(questionStepHistory);

    // find a section with the last survey item
    const nextSection = surveySections.find(surveySection =>
      surveySection.surveyItems.some(i => i._id.toString() === prevSurveyItem.toString()));

    // if cant find nextSection - return error
    if (!nextSection) return { error: 'Something went wrong' };

    // set new step
    surveyResult.step = nextSection.step;

    // remove lastSurveyItem
    surveyResult.questionStepHistory = _.initial(questionStepHistory);

    // if step is changed - adjust step history
    if (step !== nextSection.step) surveyResult.stepHistory = _.initial(stepHistory);

    return {
      nextSection
    };
  }

  // handle stepHistory and change step for normal flow
  surveyResult.step = _.last(stepHistory);
  surveyResult.stepHistory = _.initial(stepHistory);

  // return prev section
  const nextSection = surveySections.find(i => i.step === surveyResult.step);

  return {
    nextSection
  };
}
