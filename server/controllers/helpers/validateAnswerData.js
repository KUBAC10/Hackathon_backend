import _ from 'lodash';
import httpStatus from 'http-status';
import { isFloat, isEmail } from 'validator';

// services
import APIMessagesExtractor from '../../services/APIMessagesExtractor';

// helpers
import answerToString from '../helpers/answerToString';

export default async function validateAnswerData({ lang, answer, survey, surveyResult }) {
  const errorMessage = {};
  const { surveySections, name } = survey;

  // get current survey section
  const surveySection = { ...surveySections.find(i => i.step === surveyResult.step) || {} };

  if (_.isEmpty(surveySection)) {
    return {
      error: {
        status: httpStatus.UNPROCESSABLE_ENTITY,
        data: { message: 'Invalid survey step, please refresh page or contact support' }
      }
    };
  }

  // get current survey items
  if (survey.displaySingleQuestion) {
    let currentSurveyItem;

    // find current survey item vy question step history
    if (surveyResult.questionStepHistory.length) {
      currentSurveyItem = surveySection.surveyItems
        .find(i => i._id.toString() === _.last(surveyResult.questionStepHistory));
    }

    // get first survey item from section
    if (!currentSurveyItem) [currentSurveyItem] = surveySection.surveyItems;

    if (currentSurveyItem) surveySection.surveyItems = [currentSurveyItem];
  }

  const surveyItems = surveySection.surveyItems.filter(s => ['question', 'trendQuestion'].includes(s.type));

  // clear null values
  for (const item of Object.keys(answer)) {
    const itemValue = answer[item];

    if (itemValue === null) delete answer[item];
  }

  // check if survey items are valid for current step
  const currentSurveyItemsIds = surveySection.surveyItems.map(i => i._id.toString());
  const answerSurveyItemIds = Object.keys(answer).map(i => i.replace('_customAnswer', ''));

  if (answerSurveyItemIds.some(id => !currentSurveyItemsIds.includes(id))) {
    return {
      error: {
        status: httpStatus.UNPROCESSABLE_ENTITY,
        data: { message: 'Your request contain item that is not allowed on this survey step, please refresh page or contact support' }
      }
    };
  }

  // get notifications data
  const notifications = _getNotificationsData({
    surveyName: name,
    surveyItems,
    answer,
    lang: survey.defaultLanguage
  });

  // validate each question answer
  await _validateAnswer({ surveyItems, answer, lang, errorMessage });

  // return error if errors is present
  if (Object.keys(errorMessage).length) {
    return {
      error: {
        status: httpStatus.BAD_REQUEST,
        data: { message: errorMessage }
      }
    };
  }

  // return valid data
  return {
    surveySection,
    notifications
  };
}

async function _validateAnswer(options = {}) {
  const { surveyItems, answer, lang, errorMessage } = options;

  // load errors
  const [
    isRequired,
    gridItemIsRequired,
    less,
    more,
    textLimit,
    isFloatError,
    isEmailError,
    lessThenLimit,
    greaterThenLimit
  ] = await Promise.all([
    APIMessagesExtractor.getError(lang, 'global.isRequired'),
    APIMessagesExtractor.getError(lang, 'question.gridItemIsRequired'),
    APIMessagesExtractor.getError(lang, 'global.lessThanMinimum'),
    APIMessagesExtractor.getError(lang, 'global.moreThanMaximum'),
    APIMessagesExtractor.getError(lang, 'global.textLimit'),
    APIMessagesExtractor.getError(lang, 'question.isFloat'),
    APIMessagesExtractor.getError(lang, 'question.isEmail'),
    APIMessagesExtractor.getError(lang, 'question.lessThenLimit'),
    APIMessagesExtractor.getError(lang, 'question.greaterThenLimit')
  ]);

  surveyItems.forEach((item) => {
    const answerData = answer[item._id];
    const customAnswerData = answer[`${item._id}_customAnswer`];

    // check length for text question
    if (item.question && item.question.type === 'text' && item.textLimit && answerData && answerData.length > item.textLimit) {
      errorMessage[item._id] = `${textLimit}: ${item.textLimit}`;
    }
    // check if item is required and present in result
    if (item.required && _.isUndefined(answerData) && _.isUndefined(customAnswerData)) {
      errorMessage[item._id] = isRequired;
    }
    // check text question input
    if (item.question.type === 'text' && item.question.input && answerData) {
      const inputType = item.question.input;

      if (inputType === 'number') {
        if (!isFloat(answerData)) errorMessage[item._id] = isFloatError;

        const { from, to } = item.question.linearScale;

        if (isFloat(answerData) && from && parseInt(answerData, 10) < from) {
          errorMessage[item._id] = `${lessThenLimit}: ${from}`;
        }

        if (isFloat(answerData) && to && parseInt(answerData, 10) > to) {
          errorMessage[item._id] = `${greaterThenLimit}: ${to}`;
        }
      }

      if (inputType === 'email' && !isEmail(answerData)) {
        errorMessage[item._id] = isEmailError;
      }
    }

    // TODO: Validate all question types
    // TODO check and rebuild?
    // validate presence of all rows in required grid question
    if (item.required && answer[item._id] && ['multipleChoiceMatrix', 'checkboxMatrix'].includes(item.question.type)) {
      // get grid rows
      const rowIds = item.question.gridRows.map(i => i._id.toString());
      // get given rows
      const givenRows = answer[item._id].map(i => i.row);
      // check diff between given and general values and collect error message
      const diff = _.difference(rowIds, givenRows);

      if (diff.length > 0) {
        errorMessage[item._id] = {};

        diff.forEach(diffItem => (errorMessage[item._id][diffItem] = gridItemIsRequired));
      }
    }

    // check min and max answers // les then min: n
    const answersCount = _.get(answerData, 'length', 0) + (customAnswerData ? 1 : 0);

    // check min
    if (item.minAnswers && (answersCount < item.minAnswers)) {
      errorMessage[item._id] = `${less}: ${item.minAnswers}`;
    }

    // check max
    if (item.maxAnswers && (answersCount > item.maxAnswers)) {
      errorMessage[item._id] = `${more}: ${item.maxAnswers}`;
    }
  });
}

function _getNotificationsData(options = {}) {
  const { surveyName, surveyItems, answer, lang } = options;

  return surveyItems
    .filter(_hasNotification)
    .filter(i => answer[i._id] || answer[`${i._id}_customAnswer`])
    .reduce((acc, item) => {
      // get custom answer
      let customAnswer = answer[`${item._id}_customAnswer`] || '';

      // handle custom answer from net promoter score
      if (item.question.type === 'netPromoterScore' && customAnswer.length) {
        const value = answer[item._id]; // answer value

        let commentKey;

        // get key of nps comment by value
        if ([0, 1, 2, 3, 4, 5, 6].includes(value)) commentKey = `detractorsComment.${lang}`;
        if ([7, 8].includes(value)) commentKey = `passivesComment.${lang}`;
        if ([9, 10].includes(value)) commentKey = `promotersComment.${lang}`;

        // get nps comment
        const comment = _.get(item.question, commentKey, '');

        // crete string with comment for mailer
        customAnswer = `${comment}: ${customAnswer}`;
      }

      // fill custom answer filed
      if (item.question.type !== 'netPromoterScore' && customAnswer.length) {
        customAnswer = `Custom answer: ${customAnswer}`;
      }

      acc.push({
        surveyName,
        customAnswer,
        questionName: item.question.name,
        mailer: item.notificationMailer.mailer,
        emails: item.notificationMailer.emails,
        answer: answerToString({ item, answer: answer[item._id], lang })
      });

      return acc;
    }, []);
}

function _hasNotification(item) {
  return item.notificationMailer
    && item.notificationMailer.active
    && item.notificationMailer.mailer
    && item.notificationMailer.emails
    && item.notificationMailer.emails.length;
}
