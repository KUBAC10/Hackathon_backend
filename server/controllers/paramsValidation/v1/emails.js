// POST Resend Emails - /api/v1/emails/resend
function resendEmail(Joi) {
  return {
    body: Joi.object({
      email: Joi.string()
        .trim()
        .required()
    })
  };
}

export default { resendEmail };
