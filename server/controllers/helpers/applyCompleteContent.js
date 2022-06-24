import _ from 'lodash';
import parseTpl from '../../helpers/parse-es6-template';
import APIMessagesExtractor from '../../services/APIMessagesExtractor';

// TODO check if need to apply content to each survey language??
// return complete message or HTML with variables
export default async function applyCompleteContent(props) {
  const {
    response = {},
    endPage = {},
    lang = 'en',
    surveyResult = {},
    surveyType = 'survey'
  } = props;

  if (_.get(endPage, 'contentType') === 'html') {
    const html = _.get(endPage, `html.${lang}`);

    // return html if translation is present
    if (html) {
      // add data to template variables
      const resultData = {
        // add quiz results
        quizCorrect: surveyResult.quizCorrect,
        quizTotal: surveyResult.quizTotal
      };

      // parse template with variables
      endPage.html[lang] = parseTpl(html, resultData, '');

      return false;
    }
    // return default API message if html is not found
    response.message = await APIMessagesExtractor.getMessage(lang, 'survey.isCompleted');
    return false;
  }
  //
  // const message = _.get(endPage, `text.${lang}`);
  // // return message if translation is present
  // if (message) {
  //   endPage.message = message;
  //   return false;
  // }
  //
  // return default API message if html is not found

  const label = surveyType === 'quiz' ? 'quiz.isCompleted' : 'survey.isCompleted';

  response.message = await APIMessagesExtractor.getMessage(lang, label);
  return false;
}
