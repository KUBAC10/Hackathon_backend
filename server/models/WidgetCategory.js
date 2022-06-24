import keystone from 'keystone';

/**
 * WidgetCategory Model
 * ===========
 */

const Types = keystone.Field.Types;

const WidgetCategory = new keystone.List('WidgetCategory', {
  track: true,
  defaultSort: '-createdAt'
});

WidgetCategory.add({
  name: {
    type: String,
    initial: true,
    required: true
  },
  description: {
    type: String,
    initial: true
  },
  type: {
    type: Types.Select,
    options: ['general', 'chartsByType'],
    default: 'general'
  }
});

/**
 * Registration
 */
WidgetCategory.defaultColumns = 'name description';
WidgetCategory.register();

export default WidgetCategory;
