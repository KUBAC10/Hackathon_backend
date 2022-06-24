import keystone from 'keystone';

const Types = keystone.Field.Types;

/**
 * CompanyColor Model
 * =============
 */
const CompanyColor = new keystone.List('CompanyColor', {
  label: 'CompanyColor',
  plural: 'CompanyColors',
  track: true,
});

CompanyColor.add({
  value: {
    type: Types.Color,
    required: true,
    initial: true,
  },
  type: {
    type: Types.Select,
    options: 'default, company',
    default: 'company'
  },
  company: {
    type: Types.Relationship,
    ref: 'Company',
    dependsOn: { type: 'company' }
  }
});

/**
 * Registration
 */
CompanyColor.defaultColumns = 'value';
CompanyColor.register();

export default CompanyColor;
