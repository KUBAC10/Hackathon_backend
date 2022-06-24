import faker from 'faker';

// models
import { SurveyCampaign } from '../../models';

// factories
import {
  companyFactory,
  surveyFactory,
  teamFactory
} from './index';

export async function attributes(options = {}, onlyId, omit = []) {
  const company = options.company || await companyFactory({});
  const team = options.team || await teamFactory({ company });
  const res = {
    name: options.name || faker.lorem.word(),
    type: options.type,
    status: options.status,
    company,
    team,
    survey: options.survey || await surveyFactory({ company }),
    tags: options.tags,
    emails: options.emails,
    contacts: options.contacts,
    invitationMailer: options.invitationMailer,
    completionMailer: options.completionMailer,
    sendReminderMailer: options.sendReminderMailer,
    frequency: options.frequency,
    startDate: options.startDate,
    endDate: options.endDate,
    fireTime: options.fireTime,
    invitesData: options.invitesData,
    pulse: options.pulse,
    target: options.target,
    reportsMailing: options.reportsMailing,
    surveyReport: options.surveyReport,
    ...options
  };

  if (omit.length) omit.forEach(k => delete res[k]);
  return res;
}

export default async function (options = {}) {
  return await SurveyCampaign.model.create(await attributes(options));
}
