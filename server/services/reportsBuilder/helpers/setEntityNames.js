import _ from 'lodash';
import { localizationList } from '../../../../config/localization';

// return list of localized names
export default function setEntityNames(entity) {
  return localizationList.reduce((acc, lang) => (
    { ...acc, [lang]: _.get(entity, `name.${lang}`, '') }
  ), {});
}
