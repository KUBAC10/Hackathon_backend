import faker from 'faker';
import _ from 'lodash';

// helpers
import { localizationList } from '../../../config/localization';

export default function setLocalizationAttributes(options = {}, key) {
  return localizationList.reduce((acc, lang) => (
    {
      ...acc,
      [lang]: _.get(options, `${key}.${lang}`, '') ? options[key][lang] : faker.lorem.word() + Math.random()
    }
  ), {});
}
