import _ from 'lodash';
import fs from 'fs';

// models
import { Mailer, GlobalMailer } from '../models';

// helpers
import mailBuilder from '../helpers/mailBuilder';
import getCompanyName from '../helpers/getCompanyName';
import pulseMailerQuestionTemplateBuilder from '../helpers/pulseMailerQuestionTemplateBuilder';

// config
import config from '../../config/env';

const root = config.root;
const baseTemplate = fs.readFileSync(`${root}/mailers/templates/base.template.html`, 'utf8');
const linkTemplate = fs.readFileSync(`${root}/mailers/templates/link.template.html`, 'utf8');

export default async function inviteSurveyMailer(options) {
  try {
    const {
      invitationMailer,
      name,
      survey,
      email,
      token,
      type,
      surveyItem,
      question,
      _req_user
    } = options;

    let mailer = invitationMailer;

    // handle private survey URL
    let link = `${config.hostname}/survey?token=${token}`;

    // TODO invite to public surveys
    if (type === 'preview') link = `${config.hostname}/preview?token=${token}`;

    if (type === 'public') link = `${config.hostname}/${_.get(survey, 'company.urlName')}/${survey.urlName}`;

    if (!invitationMailer && survey.surveyInvitationMailer) {
      mailer = await Mailer.model.findById(survey.surveyInvitationMailer).lean();
    }

    if (!mailer || !mailer.template) {
      const globalMailer = await GlobalMailer.model.findOne({ type: 'surveyInvitation' }).lean();

      if (!globalMailer) return console.error('Invite survey global mailer error', 'survey', survey._id);

      mailer = await Mailer.model
        .findOne({ fromGlobal: true, globalMailer: globalMailer._id, company: survey.company })
        .lean();
    }

    if (!mailer) return console.error('Invite Survey Template Error', 'survey', survey._id);

    if (email) {
      const data = {
        email,
        link,
        companyName: getCompanyName(_.get(survey, 'company')),
        surveyName: survey.name[survey.defaultLanguage],
        firstName: _.get(name, 'first', ''),
        lastName: _.get(name, 'last', ''),
        hostname: config.hostname,
        year: new Date().getFullYear()
      };

      // build template
      // add link template
      let template = baseTemplate.replace('${linkTemplate}', linkTemplate);
      // interpolate template with mailer template
      template = template.replace('${content}', mailer.template);

      if (template.includes('${questionContent}') && surveyItem && question) {
        await pulseMailerQuestionTemplateBuilder({
          survey,
          question,
          roundResult: { token },
          surveyItem,
          data
        });
      }

      // reassing parsed template to mailer
      mailer.template = template;

      await mailBuilder({
        data,
        mailer: { ...mailer },
        _req_user,
        to: email,
        type: 'email',
        save: true,
        company: survey.company
      });
    }
  } catch (e) {
    return console.error(e);
  }
}
