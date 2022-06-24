import _ from 'lodash';
import { promises as fs } from 'fs';

// help-ers
import parseTpl from './parse-es6-template';
import { questionLinksTemplateBuilder } from '../controllers/api/v2/surveys.ctrl';

// config
import config from '../../config/env';

export default async function pulseMailerQuestionTemplateBuilder(options = {}) {
  try {
    const { survey, question, roundResult, surveyItem, data } = options;

    const range = {
      linearScale: _.range(1, 6).map(i => `value=${i}`),
      netPromoterScore: _.range(0, 11).map(i => `value=${i}`)
    }[question.type] || [];

    // load base template
    const baseTemplate = await fs.readFile('server/mailers/firstQuestionHtml/index.html', 'utf8');

    // build questionContent
    const questionContentTemplate = await fs.readFile('server/mailers/firstQuestionHtml/questionContent.html', 'utf8');

    const surveyLang = _.get(survey, 'defaultLanguage', 'en');
    const questionName = _.get(question, `name.${surveyLang}`);
    const questionDescription = _.get(question, `description.${surveyLang}`);

    data.questionContent = parseTpl(questionContentTemplate, { questionName, questionDescription }, '');

    const links = range.map(i => `${config.hostname}/survey?token=${roundResult.token}&surveyItem=${surveyItem._id}&${i}&lang=${surveyLang}`);

    // build questionLinksContent
    data.questionLinksContent = await questionLinksTemplateBuilder({
      question,
      invResult: { links, invite: { token: roundResult.token } },
      lang: surveyLang
    });

    data.questionContent = parseTpl(baseTemplate, data, '');
  } catch (e) {
    console.error('pulseMailerQuestionTemplateBuilder', e);
  }
}
