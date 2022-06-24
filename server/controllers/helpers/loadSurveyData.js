import _ from 'lodash';
import moment from 'moment';

// helpers
import { skipProcess } from '../helpers';

/**
 * Process and load survey by section.
 * - Just return survey with next section.
 * - Process flow logic from answer section if it present.
 * - Complete survey according to skip/display logic settings.
 * @param  {object} surveyResult
 * @param  {object} survey with related entities
 * @return {object} Return reloaded survey and survey result.
 */
export default async function loadSurveyData(surveyResult, survey) {
  try {
    const { surveySections, displaySingleQuestion, surveyType } = survey;
    const { step, answer } = surveyResult;

    const current = { ...surveySections.find(s => s.step === step) || {} };

    // get current survey items
    if (displaySingleQuestion) {
      let currentSurveyItem;

      // find current survey item vy question step history
      if (surveyResult.questionStepHistory.length) {
        currentSurveyItem = current.surveyItems
          .find(i => i._id.toString() === _.last(surveyResult.questionStepHistory));
      }

      // get first survey item from section
      if (!currentSurveyItem) [currentSurveyItem] = current.surveyItems;

      if (currentSurveyItem) current.surveyItems = [currentSurveyItem];
    }

    const logicItems = current.surveyItems.reduce((acc, { _id: surveyItem, flowLogic = [] }) => ([
      ...acc,
      ...flowLogic.map(({ method, action, section, flowItems, endPage }) => ({
        method,
        action,
        section,
        flowItems,
        surveyItem,
        endPage
      }))
    ]), []);

    const result = logicItems
      .filter(logic => logic.flowItems.length)
      .find(({ flowItems, method, surveyItem }) => (
        flowItems[method](item => skipProcess(item, answer[surveyItem]))
      ));

    if (result) {
      const { action, section, endPage } = result;
      const [currentSurveyItem] = current.surveyItems;
      let nextSection;

      if (_.last(surveyResult.questionStepHistory) !== currentSurveyItem._id.toString()) {
        surveyResult.questionStepHistory.push(currentSurveyItem._id.toString());
      }

      if (action === 'toSection' && section) {
        nextSection = {
          ...surveySections.find(s => s._id.toString() === section.toString()) || {}
        };

        if (!_.isEmpty(nextSection)) surveyResult.step = nextSection.step;

        // set first survey item of section to questionStep history
        if (!_.isEmpty(nextSection) && displaySingleQuestion) {
          const [firstSurveyItem] = nextSection.surveyItems;

          if (firstSurveyItem) {
            surveyResult.questionStepHistory.push(firstSurveyItem._id.toString());
            nextSection.surveyItems = [firstSurveyItem];
          }
        }
      }

      if (action === 'endSurvey') {
        surveyResult.completed = true;

        if (surveyType === 'survey' && endPage) {
          surveyResult.endPage = endPage;
        }
      }

      // trigger for statistic hook
      surveyResult._skippedByFlow = true;
      // handle skipped by flow logic statistic
      surveyResult.markModified('answer');
      // handle statistic data
      _skippedByFlow({
        current: current.step,
        surveyResult,
        surveySections,
        action
      });

      if (!nextSection) surveyResult.completed = true;

      return nextSection;
    }

    // TODO refactor displaySingleQuestion flow + logic
    // find next surveyItem by answer flow
    if (displaySingleQuestion) {
      let nextSurveyItem;
      const [currentSurveyItem] = current.surveyItems;
      const currentSection = { ...surveySections.find(s => s.step === step) || {} };

      if (currentSurveyItem) {
        const index = currentSection.surveyItems
          .findIndex(i => i._id.toString() === currentSurveyItem._id.toString());

        if (index !== -1) nextSurveyItem = currentSection.surveyItems[index + 1];

        if (_.last(surveyResult.questionStepHistory) !== currentSurveyItem._id.toString()) {
          surveyResult.questionStepHistory.push(currentSurveyItem._id.toString());
        }
      }

      if (nextSurveyItem) {
        currentSection.surveyItems = [nextSurveyItem];

        surveyResult.questionStepHistory.push(nextSurveyItem._id.toString());

        return currentSection;
      }
    }

    const nextSection = { ...surveySections.find(s => s.step > step) || {} };

    if (!_.isEmpty(nextSection)) {
      surveyResult.step = nextSection.step;

      // set first survey item of section to questionStep history
      if (displaySingleQuestion) {
        const [firstSurveyItem] = nextSection.surveyItems;

        if (firstSurveyItem) {
          surveyResult.questionStepHistory.push(firstSurveyItem._id.toString());
          nextSection.surveyItems = [firstSurveyItem];
        }
      }

      return nextSection;
    }

    surveyResult.completed = true;
  } catch (e) {
    return Promise.reject(e);
  }
}

function _skippedByFlow(options = {}) {
  const { surveyResult, surveySections = [], current = 0, action } = options;
  const time = moment(surveyResult.createdAt).startOf('hour').toDate();
  const next = action === 'toSection' ? surveyResult.step : Infinity;
  let { skippedByFlow = [] } = surveyResult.answer;

  // fill statistic data for skippedByFlow counter
  surveyResult._statisticData = surveySections
    .filter(({ step }) => step > current && next > step) // get skipped by flow sections
    .reduce((acc, { surveyItems = [] }) => [
      ...acc,
      ...surveyItems // filter surveyItems with questions
        .filter(({ type, question }) => ['question', 'trendQuestion'].includes(type) && question && question._id)
        .map(({ _id: surveyItem, question: { _id: question } }) => {
          skippedByFlow = [...skippedByFlow, surveyItem.toString()];

          return {
            skippedByFlow: true,
            surveyItem,
            question,
            time
          };
        })
    ], []);

  surveyResult.answer.skippedByFlow = _.uniq(skippedByFlow);
}
