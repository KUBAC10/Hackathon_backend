import _ from 'lodash';

// helpers
import parseTpl from '../../helpers/parse-es6-template';

// parse name variables
export default function parseNameVariables(options = {}) {
  const { survey = {}, surveyItems = [], lang, answer = {} } = options;
  const names = {};

  if (!survey.surveySections || !survey.surveySections.length) return;

  // get all survey items from survey
  const allSurveyItems = survey.surveySections
    .reduce((acc, { surveyItems = [] }) => [
      ...acc,
      ...surveyItems
        .filter(item => ['question', 'trendQuestion'].includes(item.type))
    ], []);

  // get items names
  allSurveyItems.forEach((item) => {
    const { question = {} } = item;
    const { questionItems = [], gridRows = [], gridColumns = [] } = question;

    // set item names by ids
    [
      ...questionItems,
      ...gridRows,
      ...gridColumns
    ].forEach((i) => {
      names[i._id] = _.get(i, `name.${lang}`);
    });
  });

  const answerStrings = {};

  // parse existed answers to strings
  Object.keys(answer).forEach((key) => {
    answerStrings[key] = _answerToString(answer[key], names);
  });

  // parse variables in names
  surveyItems.forEach((surveyItem) => {
    surveyItem.question.name[lang] = parseTpl(surveyItem.question.name[lang], answerStrings, '');

    const { questionItems = [], gridRows = [], gridColumns = [] } = surveyItem.question;

    [
      ...questionItems,
      ...gridRows,
      ...gridColumns
    ].forEach((item) => {
      item.name[lang] = parseTpl(item.name[lang], answerStrings, '');
    });
  });
}

// parse survey result answer to string format
function _answerToString(answer, names = {}) {
  const { questionItems = [], crossings, country, value, customAnswer } = answer;

  let answerString = '';

  // handle question items questions
  if (questionItems && questionItems.length) {
    questionItems.forEach((i) => {
      answerString = `${answerString} ${names[i]},`;
    });

    answerString = answerString.substring(1, answerString.length - 1);
  }

  if (crossings && crossings.length) {
    crossings.forEach((i) => {
      answerString = `${answerString} ${names[i.gridRow]} - ${names[i.gridColumn]},`;
    });

    answerString = answerString.substring(1, answerString.length - 1);
  }

  if (country) answerString = names[country];

  if (value !== undefined) answerString = value;

  if (customAnswer !== undefined) answerString = `${answerString}, ${customAnswer}`;

  return answerString;
}
