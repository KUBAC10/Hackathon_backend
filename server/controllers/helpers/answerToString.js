export default function answerToString({ item, answer, lang = 'en' }) {
  let answerString = '';

  if (answer) {
    switch (item.question.type) {
      case 'text':
      case 'linearScale':
      case 'thumbs':
      case 'netPromoterScore':
      case 'slider':
        return answer.toString();
      case 'multipleChoiceMatrix':
      case 'checkboxMatrix': {
        if (answer.length) {
          answer.forEach((i, index) => {
            answerString = answerString.concat(
              `${item.question.gridRows.find(r => r._id.toString() === i.row).name[lang]} - 
            ${item.question.gridColumns.find(c => c._id.toString() === i.column).name[lang]}`,
              index === answer.length - 1 ? '.' : ', '
            );
          });
        }

        return answerString;
      }
      case 'countryList': return answer.label;
      default: {
        if (typeof answer !== 'string') {
          answer.forEach((i, index) => {
            answerString = answerString.concat(
              item.question.questionItems.find(q => q._id.toString() === i).name[lang],
              index === answer.length - 1 ? '.' : ', '
            );
          });
        } else {
          answerString = `${item.question.questionItems.find(q => q._id.toString() === answer).name[lang]}.`;
        }

        return answerString;
      }
    }
  }
}
