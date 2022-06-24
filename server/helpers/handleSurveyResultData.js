import _ from 'lodash';

export default function handleSurveyResultData(result, data) {
  Object.keys(result.answer).forEach((key) => {
    const answer = result.answer[key];

    if (!data[key]) data[key] = {};
    if (_.isArray(answer.questionItems)) {
      answer.questionItems.forEach((field) => {
        data[key][field] = (data[key][field] || 0) + 1;
      });
    }
    if (_.isArray(answer.crossings)) {
      answer.crossings.forEach((c) => {
        data[key][`${c.gridRow}#${c.gridColumn}`] = (data[key][`${c.gridRow}#${c.gridColumn}`] || 0) + 1;
      });
    }
    if (!_.isUndefined(answer.value) && (!isNaN(parseInt(answer.value, 10)) || ['yes', 'no'].includes(answer.value))) {
      data[key][answer.value] = (data[key][answer.value] || 0) + 1;
    }
    // if (!_.isUndefined(answer.value) && !(!isNaN(parseInt
    // (answer.value, 10)) || ['yes', 'no'].includes(answer.value))) {
    //   data[key] = `${data[key]} ${answer.value}`;
    // }
    if (answer.customAnswer) {
      data[key].customAnswer = (data[key].customAnswer || 0) + 1;
    }
    if (answer.country) {
      data[key][answer.country] = (data[key][answer.country] || 0) + 1;
    }
  });
}
