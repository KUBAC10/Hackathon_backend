import faker from 'faker';
import _ from 'lodash';

// helpers
import setLocalizationAttributes from './setLocalizationAttributes';

// models
import { Survey } from '../../models';

// factories
import { teamFactory } from './index';

export async function attributes(options = {}, onlyId, omit = []) {
  const team = options.team || await teamFactory({ company: options.company }, onlyId);
  const company = options.company || team.company;
  const translation = options.translation || { en: true };
  const footer = options.footer || {};
  const res = {
    translation,
    name: options.name || setLocalizationAttributes(options, 'name'),
    description: options.description || setLocalizationAttributes(options, 'description'),
    urlName: options.urlName || _.deburr(_.kebabCase(faker.name.title() + Math.random())),
    team: onlyId ? team._id : team,
    company: onlyId ? company._id : company,
    active: options.active,
    publicAccess: options.publicAccess,
    startDate: options.startDate,
    endDate: options.endDate,
    type: options.type || 'survey',
    surveyType: options.surveyType || 'survey',
    allowReAnswer: options.allowReAnswer,
    originalSurvey: options.originalSurvey,
    footer: {
      active: footer.active || false,
      text: footer.text || setLocalizationAttributes(footer, 'text'),
      content: footer.content,
      align: footer.align || 'center'
    },
    references: options.references,
    scope: options.scope,
    createdBy: options.createdBy,
    defaultLanguage: options.defaultLanguage || 'en',
    inDraft: options.inDraft || false,
    draftData: options.draftData,
    showResultText: options.showResultText,
    displaySingleQuestion: options.displaySingleQuestion,
    customAnimation: options.customAnimation,
    publicTTL: options.publicTTL,
    lastAnswerDate: options.lastAnswerDate,
    primaryPulse: options.primaryPulse,
    publicPreview: options.publicPreview,
    distributeByTargets: options.distributeByTargets,
    scoring: options.scoring
  };

  // TODO rewrite! to normal processing theme data
  if (options.statusBar) {
    res._underscoreData = {
      _withTheme: {
        progressBar: true,
        questionNumbers: true
      }
    };
  }

  if (omit.length) omit.forEach(k => delete res[k]);
  return res;
}

export default async function (options = {}, onlyId) {
  const res = await attributes(options, onlyId);
  const obj = new Survey.model(res);

  if (res._underscoreData) Object.assign(obj, res._underscoreData);

  await obj.save();

  return obj;
}
