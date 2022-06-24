const fieldActions = ['empty', 'notEmpty'];
const itemsActions = ['selected', 'notSelected'];
const textActions = ['equal', 'notEqual', 'contains', 'notContains', 'matchRegExp'];
const logicActions = ['greater', 'greaterEqual', 'less', 'lessEqual', 'equal', 'notEqual'];

const questionTypes = [
  'text',
  'multipleChoice',
  'dropdown',
  'checkboxes',
  'slider',
  'linearScale',
  'netPromoterScore',
  'thumbs',
  'multipleChoiceMatrix',
  'checkboxMatrix'
];

const skipItemSchema = Joi => Joi.object({
  _id: Joi.objectId(),
  type: Joi.string()
    .required()
    .valid('endSurvey', 'toSection'),
  toSection: Joi.string().when('type', { is: 'toSection', then: Joi.required() }),
  surveyItem: Joi.string().required(),
  surveySection: Joi.string().required(),
  questionType: Joi.string().valid(questionTypes).required()
})
// multipleChoice and dropdown
  .when(Joi.object({
    questionType: Joi.only('multipleChoice', 'dropdown'),
    action: Joi.only(fieldActions)
  }), {
    then: {
      action: Joi.string().required().valid(fieldActions),
    }
  })
  .when(Joi.object({
    questionType: Joi.only('multipleChoice', 'dropdown'),
    action: Joi.only(itemsActions)
  }), {
    then: {
      action: Joi.string().required().valid(itemsActions),
      questionItems: Joi.array().items(Joi.string()).required()
    }
  })
  .when(Joi.object({ questionType: Joi.only('multipleChoice', 'dropdown') }), {
    then: {
      action: Joi.string().required().valid([...itemsActions, ...fieldActions]),
    }
  })
  // checkboxes
  .when(Joi.object({
    questionType: 'checkboxes',
    action: Joi.only(fieldActions)
  }), {
    then: {
      action: Joi.string().required().valid(fieldActions),
    }
  })
  .when(Joi.object({
    questionType: 'checkboxes',
    action: Joi.only(itemsActions)
  }), {
    then: {
      action: Joi.string().required().valid(itemsActions),
      questionItems: Joi.array().items(Joi.string()).required(),
    }
  })
  .when(Joi.object({
    questionType: 'checkboxes',
    action: Joi.only(logicActions)
  }), {
    then: {
      action: Joi.string().required().valid(logicActions),
      count: Joi.number().positive().required(),
    }
  })
  .when(Joi.object({ questionType: 'checkboxes', }), {
    then: {
      action: Joi.string().required().valid([...itemsActions, ...logicActions, ...fieldActions])
    }
  })
  // slider linearScale netPromoterScore
  .when(Joi.object({
    questionType: Joi.only('slider', 'linearScale', 'netPromoterScore'),
    action: Joi.only(logicActions)
  }), {
    then: {
      action: Joi.string().required().valid(logicActions),
      value: Joi.number().required()
    }
  })
  .when(Joi.object({
    questionType: Joi.only('slider', 'linearScale', 'netPromoterScore'),
    action: Joi.only(fieldActions)
  }), {
    then: {
      action: Joi.string().required().valid(fieldActions),
    }
  })
  .when(Joi.object({ questionType: Joi.only('slider', 'linearScale', 'netPromoterScore') }), {
    then: {
      action: Joi.string().required().valid([...logicActions, ...fieldActions]),
    }
  })
  // text
  .when(Joi.object({ questionType: 'text', action: Joi.only(fieldActions) }), {
    then: {
      action: Joi.string().required().valid(fieldActions),
    }
  })
  .when(Joi.object({ questionType: 'text', action: Joi.only(textActions) }), {
    then: {
      action: Joi.string().required().valid(textActions),
      value: Joi.string().required()
    }
  })
  .when(Joi.object({ questionType: 'text' }), {
    then: {
      action: Joi.string().required().valid([...textActions, ...fieldActions]),
    }
  })
  // thumbs
  .when(Joi.object({ questionType: 'thumbs', action: Joi.only('equal', 'notEqual') }), {
    then: {
      action: Joi.string().required().valid('equal', 'notEqual'),
      value: Joi.string().required().valid('yes', 'no')
    }
  })
  .when(Joi.object({ questionType: 'thumbs', action: Joi.only(fieldActions) }), {
    then: {
      action: Joi.string().required().valid(fieldActions),
      value: Joi.string().required().valid('yes', 'no')
    }
  })
  .when(Joi.object({ questionType: 'thumbs' }), {
    then: {
      action: Joi.string().required().valid('equal', 'notEqual', ...fieldActions),
    }
  })
  // multipleChoiceMatrix and checkboxMatrix
  .when(Joi.object({
    questionType: Joi.only('multipleChoiceMatrix', 'checkboxMatrix'),
    action: Joi.only(itemsActions)
  }), {
    then: {
      gridRow: Joi.string().required(),
      gridColumn: Joi.string().required(),
      action: Joi.string().required().valid(itemsActions)
    }
  })
  .when(Joi.object({
    questionType: Joi.only('multipleChoiceMatrix', 'checkboxMatrix'),
    action: Joi.only(logicActions)
  }), {
    then: {
      count: Joi.number().positive().required(),
      action: Joi.string().required().valid(logicActions)
    }
  })
  .when(Joi.object({
    questionType: Joi.only('multipleChoiceMatrix', 'checkboxMatrix'),
    action: Joi.only(fieldActions)
  }), {
    then: {
      action: Joi.string().required().valid(fieldActions)
    }
  })
  .when(Joi.object({ questionType: Joi.only('multipleChoiceMatrix', 'checkboxMatrix') }), {
    then: {
      action: Joi.string().required().valid([...itemsActions, ...logicActions, ...fieldActions])
    }
  });

const displayItemSchema = Joi => Joi.object({
  _id: Joi.objectId(),
  operator: Joi.string().valid('and', 'or'),
  surveyItem: Joi.string().required(),
  surveySection: Joi.string().required(),
  toSection: Joi.string().required(),
  questionType: Joi.string().valid(questionTypes).required(),
  questionItems: Joi.array().items(Joi.string()),
})
// multipleChoice and dropdown
  .when(Joi.object({
    questionType: Joi.only('multipleChoice', 'dropdown'),
    action: Joi.only(fieldActions)
  }), {
    then: {
      action: Joi.string().required().valid(fieldActions),
    }
  })
  .when(Joi.object({
    questionType: Joi.only('multipleChoice', 'dropdown'),
    action: Joi.only(itemsActions)
  }), {
    then: {
      action: Joi.string().required().valid(itemsActions),
      questionItems: Joi.array().items(Joi.string()).required()
    }
  })
  .when(Joi.object({ questionType: Joi.only('multipleChoice', 'dropdown') }), {
    then: {
      action: Joi.string().required().valid([...itemsActions, ...fieldActions]),
    }
  })
  // checkboxes
  .when(Joi.object({
    questionType: 'checkboxes',
    action: Joi.only(fieldActions)
  }), {
    then: {
      action: Joi.string().required().valid(fieldActions),
    }
  })
  .when(Joi.object({
    questionType: 'checkboxes',
    action: Joi.only(itemsActions)
  }), {
    then: {
      action: Joi.string().required().valid(itemsActions),
      questionItems: Joi.array().items(Joi.string()).required(),
    }
  })
  .when(Joi.object({
    questionType: 'checkboxes',
    action: Joi.only(logicActions)
  }), {
    then: {
      action: Joi.string().required().valid(logicActions),
      count: Joi.number().positive().required(),
    }
  })
  .when(Joi.object({ questionType: 'checkboxes', }), {
    then: {
      action: Joi.string().required().valid([...itemsActions, ...logicActions, ...fieldActions])
    }
  })
  // slider linearScale netPromoterScore
  .when(Joi.object({
    questionType: Joi.only('slider', 'linearScale', 'netPromoterScore'),
    action: Joi.only(logicActions)
  }), {
    then: {
      action: Joi.string().required().valid(logicActions),
      value: Joi.number().required()
    }
  })
  .when(Joi.object({
    questionType: Joi.only('slider', 'linearScale', 'netPromoterScore'),
    action: Joi.only(fieldActions)
  }), {
    then: {
      action: Joi.string().required().valid(fieldActions),
    }
  })
  .when(Joi.object({ questionType: Joi.only('slider', 'linearScale', 'netPromoterScore') }), {
    then: {
      action: Joi.string().required().valid([...logicActions, ...fieldActions]),
    }
  })
  // text
  .when(Joi.object({ questionType: 'text', action: Joi.only(fieldActions) }), {
    then: {
      action: Joi.string().required().valid(fieldActions),
    }
  })
  .when(Joi.object({ questionType: 'text', action: Joi.only(textActions) }), {
    then: {
      action: Joi.string().required().valid(textActions),
      value: Joi.string().required()
    }
  })
  .when(Joi.object({ questionType: 'text' }), {
    then: {
      action: Joi.string().required().valid([...textActions, ...fieldActions]),
    }
  })
  // thumbs
  .when(Joi.object({ questionType: 'thumbs', action: Joi.only('equal', 'notEqual') }), {
    then: {
      action: Joi.string().required().valid('equal', 'notEqual'),
      value: Joi.string().required().valid('yes', 'no')
    }
  })
  .when(Joi.object({ questionType: 'thumbs', action: Joi.only(fieldActions) }), {
    then: {
      action: Joi.string().required().valid(fieldActions),
      value: Joi.string().required().valid('yes', 'no')
    }
  })
  .when(Joi.object({ questionType: 'thumbs' }), {
    then: {
      action: Joi.string().required().valid('equal', 'notEqual', ...fieldActions),
    }
  })
  // multipleChoiceMatrix and checkboxMatrix
  .when(Joi.object({
    questionType: Joi.only('multipleChoiceMatrix', 'checkboxMatrix'),
    action: Joi.only(itemsActions)
  }), {
    then: {
      gridRow: Joi.string().required(),
      gridColumn: Joi.string().required(),
      action: Joi.string().required().valid(itemsActions)
    }
  })
  .when(Joi.object({
    questionType: Joi.only('multipleChoiceMatrix', 'checkboxMatrix'),
    action: Joi.only(logicActions)
  }), {
    then: {
      count: Joi.number().positive().required(),
      action: Joi.string().required().valid(logicActions)
    }
  })
  .when(Joi.object({
    questionType: Joi.only('multipleChoiceMatrix', 'checkboxMatrix'),
    action: Joi.only(fieldActions)
  }), {
    then: {
      action: Joi.string().required().valid(fieldActions)
    }
  })
  .when(Joi.object({ questionType: Joi.only('multipleChoiceMatrix', 'checkboxMatrix') }), {
    then: {
      action: Joi.string().required().valid([...itemsActions, ...logicActions, ...fieldActions])
    }
  });

export default { skipItemSchema, displayItemSchema };
