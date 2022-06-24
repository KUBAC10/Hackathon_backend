import _ from 'lodash';

// Skip process returns true or false according to results of skip settings
export default function skipProcess(item = {}, answer = {}) {
  const {
    questionType,
    count,
    value,
    gridRow,
    gridColumn,
    country,
    questionItems = [],
    customAnswer,
    condition: action,
  } = item;

  // get data from answer
  const {
    crossings = [],
    value: resultValue,
    country: countryAnswer,
    questionItems: answerQuestionItems = [],
    customAnswer: resultCustomAnswer
  } = answer;

  // handle custom answer condition
  if (customAnswer) questionItems.push('customAnswer');
  if (resultCustomAnswer) answerQuestionItems.push('customAnswer');

  // return result on appropriate actions
  if (action === 'empty') return _.isEmpty(answer);
  if (action === 'notEmpty') return !_.isEmpty(answer);
  if (_.isEmpty(answer)) return false;

  // process skip logic according to question type and actions
  switch (questionType) {
    case 'multipleChoice':
    case 'dropdown':
      return processMultipleChoice({
        action,
        items: questionItems.map(i => i.toString()),
        resultItems: answerQuestionItems.map(i => i.toString())
      });
    case 'imageChoice':
    case 'checkboxes':
      return processMultipleOptions({
        count,
        action,
        questionItems: questionItems.map(i => i.toString()),
        resultItems: answerQuestionItems.map(i => i.toString())
      });
    case 'netPromoterScore':
    case 'linearScale':
    case 'slider':
      return processSlider({
        action,
        value,
        resultValue
      });
    case 'text':
      return processText({
        action,
        value,
        resultValue
      });
    case 'thumbs':
      return processThumbs({
        action,
        value,
        resultValue
      });
    case 'multipleChoiceMatrix':
    case 'checkboxMatrix': {
      let resultItems = crossings.map(c => `${c.gridRow}-${c.gridColumn}`);

      if (gridRow && !gridColumn) {
        resultItems = crossings
          .filter(c => c.gridRow === gridRow.toString())
          .map(c => `${c.gridRow}-${c.gridColumn}`);
      }

      if (!gridRow && gridColumn) {
        resultItems = crossings
          .filter(c => c.gridColumn === gridColumn.toString())
          .map(c => `${c.gridRow}-${c.gridColumn}`);
      }

      return processMultipleOptions({
        count,
        action,
        questionItems: [`${gridRow}-${gridColumn}`],
        resultItems
      });
    }
    case 'countryList':
      return processMultipleChoice({
        action,
        items: [country.toString()],
        resultItems: [countryAnswer]
      });
    default:
      return false;
  }
}

// process Thumbs actions
function processThumbs({ action, value, resultValue }) {
  switch (action) {
    case 'equal':
      return equal(value, resultValue);
    case 'notEqual':
      return !equal(value, resultValue);
    default:
      return false;
  }
}

// describe multipleChoice actions
function processMultipleChoice({ action, items, resultItems }) {
  switch (action) {
    case 'selected':
      return selected(items, resultItems);
    case 'notSelected':
      return !selected(items, resultItems);
    default:
      return false;
  }
}

// describe checkboxes actions
function processMultipleOptions({ action, count, questionItems, resultItems }) {
  switch (action) {
    case 'selected':
      return selected(questionItems, resultItems);
    case 'notSelected':
      return !selected(questionItems, resultItems);
    case 'greater':
      return greater(resultItems.length, count);
    case 'greaterEqual':
      return greaterEqual(count, resultItems.length);
    case 'less':
      return greater(count, resultItems.length);
    case 'lessEqual':
      return greaterEqual(resultItems.length, count);
    case 'equal':
      return equal(resultItems.length, count);
    case 'notEqual':
      return !equal(resultItems.length, count);
    default:
      return false;
  }
}

// describe text actions
// 'beginsWith', 'endsWith'
function processText({ action, value, resultValue }) {
  switch (action) {
    case 'equal':
      return equal(value, resultValue);
    case 'notEqual':
      return !equal(value, resultValue);
    case 'contains':
      return contains(value, resultValue);
    case 'notContains':
      return !contains(value, resultValue);
    case 'beginsWith':
      return beginsWith(value, resultValue);
    case 'endsWith':
      return endsWith(value, resultValue);
    case 'matchRegExp':
      return matchRegExp(value, resultValue);
    default:
      return false;
  }
}

// describe slider actions
function processSlider({ action, value, resultValue }) {
  switch (action) {
    case 'selected':
      return selected(value, resultValue);
    case 'notSelected':
      return !selected(value, resultValue);
    case 'greater':
      return greater(resultValue, value);
    case 'greaterEqual':
      return greaterEqual(value, resultValue);
    case 'less':
      return greater(value, resultValue);
    case 'lessEqual':
      return greaterEqual(resultValue, value);
    case 'equal':
      return equal(parseInt(value, 10), parseInt(resultValue, 10));
    case 'notEqual':
      return !equal(value, resultValue);
    default:
      return false;
  }
}

// selected
function selected(items, resultItems) {
  return items.every(i => resultItems.includes(i));
}

// greater
function greater(value, count) {
  return _.gt(parseInt(value, 10), parseInt(count, 10));
}

// greaterEqual
function greaterEqual(value, count) {
  return _.gte(parseInt(count, 10), parseInt(value, 10));
}

// equal
function equal(items, selectedItems) {
  return _.isEqual(items, selectedItems);
}

// contains
function contains(text, value) {
  return _.includes(value, text);
}

// matches regExp
function matchRegExp(regEx, value) {
  return new RegExp(regEx).test(value);
}

// beginsWith
function beginsWith(value, resultValue) {
  return resultValue.startsWith(value);
}

// beginsWith
function endsWith(value, resultValue) {
  return resultValue.endsWith(value);
}
