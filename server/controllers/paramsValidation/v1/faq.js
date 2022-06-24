function show(Joi) {
  return {
    params: {
      urlName: Joi.string().required()
    }
  };
}

export default { show };
