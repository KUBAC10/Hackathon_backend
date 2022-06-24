export default function lessThan(joi) {
  return {
    name: 'number',
    base: joi.number(),
    language: {
      lessThan: 'must be less than {{lessThan}} value'
    },
    rules: [{
      name: 'lessThan',
      params: {
        lessThan: joi.func().ref().required(),
        field: joi.string()
      },
      validate(params, value, state, options) {
        const prevName = params.lessThan.root;
        const prev = state.parent[prevName];
        if (value > prev) {
          return this.createError('number.lessThan', {
            value,
            lessThan: params.field || prev
          }, state, options);
        }
        return value;
      }
    }]
  };
}
