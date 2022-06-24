// GET /api/v1/distribute/recipients - find recipients by tag or name
function findRecipients(Joi) {
  return {
    params: Joi.object({
      id: Joi.objectId()
        .required()
    }),
    query: Joi.object({
      value: Joi.string()
        .min(2)
        .allow('#')
        .required()
    })
  };
}

// GET /api/v1/distribute/tag/:id - show tag emails
function showTag(Joi) {
  return {
    params: Joi.object({
      id: Joi.objectId()
        .required()
    })
  };
}

// POST /api/v1/distribute - create survey campaign
function create(Joi) {
  return {
    body: Joi.object({
      survey: Joi.objectId()
        .required(),
      type: Joi.string()
        .valid('email', 'mobile', 'social')
        .required(),
      target: Joi.objectId()
    })
  };
}

// GET /api/v1/distribute - get list of survey campaigns
function list(Joi) {
  return {
    query: Joi.object({
      skip: Joi.number(),
      limit: Joi.number().valid(5, 10, 25, 50, 100, 1000),
      survey: Joi.objectId()
        .required()
    })
  };
}

// PUT /api/v1/distribute/:id - update survey campaign
function show(Joi) {
  return {
    params: Joi.object({
      id: Joi.objectId()
        .required()
    }),
  };
}

// GET /api/v1/distribute/:id/mailer-preview
function mailerPreview(Joi) {
  return {
    params: Joi.object({
      id: Joi.objectId()
        .required()
    }),
    query: Joi.object({
      type: Joi.string()
        .valid('pulseCompleted', 'pulseFirstInvitation', 'pulseSecondInvitation', 'pulseReminder', 'reminderAfterFirstInvitation', 'reminderAfterSecondInvitation', 'pulseReminderWithQuestion')
        .required()
    })
  };
}

// PUT /api/v1/distribute/:id - update survey campaign
function update(Joi) {
  return {
    params: Joi.object({
      id: Joi.objectId()
        .required()
    }),
    body: Joi.object({
      name: Joi.string(),
      status: Joi.string().valid('paused', 'active', 'finished'),
      socialType: Joi.string().valid('whatsApp'),
      sendCompletionMailer: Joi.boolean(),
      dontSendReport: Joi.boolean(),
      sendReminderMailer: Joi.boolean(),
      frequency: Joi.string().valid('once', 'everyDay', 'weekly', 'otherWeek', 'monthly', 'otherMonth', 'quarterly', '1hours', '4hours', '8hours'),
      duration: Joi.string().valid('auto', 'month', 'halfYear', 'year'),
      questionPerSurvey: Joi.number().allow(null),
      dayOfWeek: Joi.string().valid('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'),
      fireTime: Joi.date(),
      startDate: Joi.date(),
      endDate: Joi.date().allow(null),
      invitationMailerCustomText: Joi.string().allow(null),
      completionMailerCustomText: Joi.string().allow(null),
      reminderMailerCustomText: Joi.string().allow(null)
    })
  };
}

// PUT /api/v1/distribute/recipients/:id - edit survey campaign recipients
function editRecipients(Joi) {
  return {
    params: Joi.object({
      id: Joi.objectId()
        .required()
    }),
    body: Joi.object({
      entities: Joi.string().valid('emails', 'numbers', 'contacts', 'tags').required(),
      action: Joi.string().valid('add', 'remove').required(),
      value: Joi.alternatives([
        Joi.objectId().when('entities', { is: Joi.only('contacts', 'tags'), then: Joi.required() }),
        Joi.string().when('entities', { is: Joi.only('numbers', 'emails'), then: Joi.required() })
      ]).required(),
    })
  };
}

// POST /api/v1/distribute/:id - create survey campaign from existed
function createFromCopy(Joi) {
  return {
    params: Joi.object({
      id: Joi.objectId()
        .required()
    }),
  };
}

// DELETE /api/v1/distribute/:id - remove survey campaign
function destroy(Joi) {
  return {
    params: Joi.object({
      id: Joi.objectId()
        .required()
    })
  };
}

// PUT /api/v1/distribute/:id/rounds/:roundId - update round
function updateRound(Joi) {
  return {
    params: Joi.object({
      id: Joi.objectId()
        .required(),
      roundId: Joi.objectId()
        .required()
    }),
    body: Joi.object({
      dayOfWeek: Joi.string().valid('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday')
    })
  };
}

// POST /api/v1/distribute/:id/rounds/:roundId/send-reminders - send reminders
function sendReminders(Joi) {
  return {
    params: Joi.object({
      id: Joi.objectId()
        .required(),
      roundId: Joi.objectId()
        .required()
    })
  };
}

function roundsList(Joi) {
  return {
    params: Joi.object({
      id: Joi.objectId()
        .required(),
    })
  };
}

// GET /api/v1/distribute/unsubscribe/:token - unsubscribe user onto distribute
function unsubscribe(Joi) {
  return {
    params: Joi.object({
      token: Joi.string()
        .required()
    })
  };
}

export default {
  findRecipients,
  showTag,
  create,
  list,
  show,
  mailerPreview,
  update,
  createFromCopy,
  destroy,
  editRecipients,
  updateRound,
  sendReminders,
  roundsList,
  unsubscribe
};
