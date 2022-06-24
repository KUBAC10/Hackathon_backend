import _ from 'lodash';

export default function getCompanyName(company = {}) {
  if (company.isLite) return 'Screver';

  return _.get(company, 'name', 'Screver');
}
