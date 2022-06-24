import { extendMoment } from 'moment-range/dist/moment-range';
import Moment from 'moment-timezone';

const moment = extendMoment(Moment);

// return report range with split by type - hours, day, week, month
export default function getReportRange(options = {}) {
  try {
    const { from, to, prevPeriod } = options;
    const { range, prevRange, days } = _getRange(from, to, prevPeriod);
    let type;

    // get type of range according to count of days
    switch (true) {
      case days <= 1:
        type = 'hours';
        break;
      case days <= 7:
        type = 'days';
        break;
      case (days > 7 && days <= 60):
        type = 'week';
        break;
      case days > 60:
        type = 'month';
        break;
      default:
        type = false;
    }
    return { type, range, prevRange };
  } catch (e) {
    return Promise.reject(e);
  }
}

// get range by from - to dates
function _getRange(dateFrom, dateTo, prevPeriod) {
  let prevRange;

  const from = moment(dateFrom).startOf('day');
  const to = moment(dateTo).endOf('day');
  const range = moment.range(from, to);
  const days = range.diff('days');

  if (prevPeriod) {
    const prevFrom = moment(from).subtract(days + 1, 'days');
    const prevTo = moment(from).subtract(1, 'days');
    prevRange = moment.range(moment(prevFrom).startOf('day'), moment(prevTo).endOf('day'));
  }

  return { range, prevRange, days };
}
