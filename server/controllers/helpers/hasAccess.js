import _ from 'lodash';

export default function hasAccess(doc, accessFields) {
  return Object
    .keys(accessFields)
    .every(key => key && (_.get(doc, key, '').toString() === _.get(accessFields, key, '').toString()
      || _.get(doc, `${key}._id`).toString() === _.get(accessFields, key, '').toString()));
}
