import keystone from 'keystone';

// config
import { localizationList } from '../../config/localization';

const Types = keystone.Field.Types;

/**
 * Term Model
 * =============
 */
const Term = new keystone.List('Term', {
  label: 'Term',
  plural: 'Terms',
  track: true,
});

Term.add({
  name: {
    type: String,
    initial: true,
  },
  nameShort: {
    type: Types.Select,
    options: localizationList.reduce((acc, lang) => `${acc},${lang}`, 'none'),
    default: 'none',
  },
  template: {
    type: Types.Html,
    wysiwyg: true
  }
});

/**
 * Registration
 */
Term.defaultColumns = 'name';
Term.register();

export default Term;
