import { localizationList } from '../../config/localization';

export default function multiLangSearchBuilder(field, value) {
  return localizationList.map(lang => (
    { [`${field}.${lang}`]: { $regex: value, $options: 'i' } }
  ));
}
