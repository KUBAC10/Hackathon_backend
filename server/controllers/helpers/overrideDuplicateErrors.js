import _ from 'lodash';

export default function overrideDuplicateErrors(errors) {
  return errors.map((e) => {
    // override default duplicate name error
    if (e.type === 'array.unique') {
      const errorName = _.get(e, 'context.value.name');
      const errorCrossing = _.get(e, 'context.label') === 'crossings';

      // process dupe name errors
      if (_.isObject(errorName) && Object.keys(errorName).length) {
        e.path.push('name', Object.keys(errorName)[0]);
        return {
          ...e,
          type: 'valueDuplicate',
          context: { ...e.context, _customErrorPath: e.path }
        };
      }

      // process dupe gridRow - gridColumn errors
      if (errorCrossing) {
        return {
          ...e,
          type: 'valueDuplicate',
          context: { ...e.context, _customErrorPath: e.path }
        };
      }
    }
    return e;
  });
}
