export default function questionReusableTypeError(errors) {
  return errors.map((e) => {
    // override default error allowOnly error
    if (e.type === 'any.allowOnly') {
      return {
        ...e,
        type: 'questionReusableType'
      };
    }
    return e;
  });
}
