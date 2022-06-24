import _ from 'lodash';

// helpers
import setEntityNames from './setEntityNames';

// TODO use translate()?
const customAnswerName = {
  en: 'Custom answers',
  de: 'Kundenspezifische Antworten',
  nl: 'Aangepaste antwoorden',
  ru: 'Другие ответы',
  fr: 'Réponses personnalisées'
};

// return question base data according to question type
export default function setBaseQuestionData(question, surveyItem, customAnswer) {
  switch (question.type) {
    case 'slider':
    case 'linearScale':
    case 'netPromoterScore':
      return {
        textComment: question.textComment,
        linearScale: question.linearScale,
        range: _getLinearScaleRange(question)
          .map((item, index) => ({
            _id: index,
            name: item.toString()
          }))
      };
    case 'thumbs': {
      return {
        linearScale: question.linearScale,
        range: [
          { _id: 0, name: 'yes', caption: _.get(question, 'linearScale.fromCaption') },
          { _id: 1, name: 'no', caption: _.get(question, 'linearScale.toCaption') }
        ]
      };
    }
    case 'dropdown':
    case 'checkboxes':
    case 'multipleChoice': {
      const questionItems = question.questionItems
        .map(item => ({
          _id: item._id,
          name: setEntityNames(item),
        }));

      if ((surveyItem && surveyItem.customAnswer) || customAnswer) {
        questionItems.push({
          _id: 'customAnswer',
          name: customAnswerName
        });
      }

      return { questionItems };
    }
    case 'imageChoice': {
      const questionItems = question.questionItems
        .map(item => ({
          _id: item._id,
          name: setEntityNames(item),
          dataType: item.dataType,
          icon: item.icon,
          bgImage: item.bgImage,
          imgCloudinary: item.imgCloudinary,
          unsplashUrl: item.unsplashUrl
        }));

      if ((surveyItem && surveyItem.customAnswer) || customAnswer) {
        questionItems.push({
          _id: 'customAnswer',
          name: customAnswerName
        });
      }

      return { questionItems };
    }
    case 'checkboxMatrix':
    case 'multipleChoiceMatrix':
      return {
        gridRows: question.gridRows
          .map(row => ({
            _id: row._id,
            name: setEntityNames(row)
          })),
        gridColumns: question.gridColumns
          .map(column => ({
            _id: column._id,
            name: setEntityNames(column),
            score: column.score
          })),
      };
    default:
      return {};
  }
}

// get range by type - netPromoterScore, linearScale, slider, thumbs
function _getLinearScaleRange(question) {
  if (question.type === 'netPromoterScore') return _.range(0, 11);

  if (question.type === 'thumbs') return ['yes', 'no'];

  if (question.type === 'linearScale' && question.linearScale.icon === 'smiley') return _.range(1, question.linearScale.to + 1);

  return _.range(question.linearScale.from || 1, question.linearScale.to + 1);
}
