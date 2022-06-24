import keystone from 'keystone';
import { localizeField } from '../../config/localization';

/**
 * Faq Model
 * ===========
 */
const Faq = new keystone.List('Faq', {
  track: true
});

Faq.add({
  urlName: {
    type: String,
    initial: true,
    required: true,
  },
  name: localizeField('Faq.name'),
  article: localizeField('Faq.article'),
});

/**
 * Registration
 */
Faq.defaultColumns = 'urlName name article';
Faq.register();

export default Faq;
