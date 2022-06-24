import moment from 'moment/moment';

export default function parseSingleDateToRange(date, timeZone) {
  const obj = {};
  if (date.$eq) {
    obj.$gte = moment(Object.values(date)[0]).startOf('day').tz(timeZone);
    obj.$lte = moment(Object.values(date)[0]).endOf('day').tz(timeZone);
    return obj;
  }
  return date;
}
