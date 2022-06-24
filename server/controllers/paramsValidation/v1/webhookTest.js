// POST webhook - /api/v1/webhook-test
function webhook(Joi) {
  return {
    body: Joi.object({
      x: Joi.string(),
      y: Joi.number()
    })
  };
}

export default { webhook };
