import moment from 'moment';

// services
import { APIMessagesExtractor } from '../../services';

export default async function surveyAccess(options = {}) {
  const { lang, timeZone, startDate, endDate } = options;

  if (startDate && moment(moment().tz(timeZone)) < startDate) {
    return await APIMessagesExtractor.getMessage(lang, 'survey.notStarted'); // not starting
  }

  if (endDate && moment(moment().tz(timeZone)) > endDate) {
    return await APIMessagesExtractor.getMessage(lang, 'survey.expired'); // expired
  }
}
