import { localizeValidations, localizationList } from '../../../../config/localization';

import { iconTypes as pulseSurveyDriverIconTypes } from '../../../models/PulseSurveyDriver';
import { iconTypes as itemIconTypes } from '../../../models/QuestionItem';

const entities = ['surveySection', 'surveyItem', 'contentItem', 'question', 'questionItem', 'gridRow', 'gridColumn', 'flowLogic', 'displayLogic', 'flowItem', 'pulseSurveyDriver', 'contentItemElement'];
const actions = ['create', 'update', 'remove'];
const questionTypes = ['countryList', 'text', 'multipleChoice', 'checkboxes', 'dropdown', 'linearScale', 'thumbs', 'netPromoterScore', 'slider', 'multipleChoiceMatrix', 'checkboxMatrix', 'imageTriangle', 'imageChoice'];
const iconTypes = ['ordinary', 'star', 'favorite', 'thumb', 'smiley', 'crown', 'trophy', 'fingers', 'fire', 'party', 'skull', 'dollar', 'virus'];
const fieldActions = ['empty', 'notEmpty'];
const itemsActions = ['selected', 'notSelected'];
const textActions = ['equal', 'notEqual', 'contains', 'notContains', 'matchRegExp', 'beginsWith', 'endsWith'];
const logicActions = ['greater', 'greaterEqual', 'less', 'lessEqual', 'equal', 'notEqual'];
const contentTypes = ['title', 'text', 'titleText', 'image', 'textImage', 'video', 'textVideo', 'line', 'socialIcons', 'html'];
const startPageTypes = ['title', 'text', 'titleText', 'contentImage', 'html'];
const endPageTypes = ['title', 'text', 'titleText', 'contentImage', 'html'];

const flowItemSchema = Joi => Joi.object({
  flowLogic: Joi.objectId(),
  displayLogic: Joi.objectId(),
  questionType: Joi.string().valid(...questionTypes, 'endPage').required(),
  sortableId: Joi.number(),
})
  // endPage conditions
  .when(Joi.object({
    questionType: 'endPage',
    condition: Joi.only('equal', 'less', 'greater')
  }), {
    then: {
      endPage: Joi.objectId(),
      condition: Joi.valid('equal', 'less', 'greater'),
      count: Joi.number()
    }
  })
  .when(Joi.object({
    questionType: 'endPage',
    condition: 'range'
  }), {
    then: {
      endPage: Joi.objectId(),
      condition: 'range',
      range: Joi.object({
        from: Joi.number(),
        to: Joi.number()
      })
    }
  })
  // multipleChoice and dropdown
  .when(Joi.object({
    questionType: Joi.only('multipleChoice', 'dropdown'),
    condition: Joi.only(fieldActions)
  }), {
    then: {
      condition: Joi.string().required().valid(fieldActions),
    }
  })
  .when(Joi.object({
    questionType: 'dropdown',
    condition: Joi.only(itemsActions)
  }), {
    then: {
      condition: Joi.string().required().valid(itemsActions),
      questionItems: Joi.array().items(Joi.objectId()).required(),
    }
  })
  .when(Joi.object({
    questionType: 'multipleChoice',
    condition: Joi.only(itemsActions)
  }), {
    then: Joi.object({
      condition: Joi.string().valid(itemsActions).required(),
      questionItems: Joi.array().items(Joi.objectId()),
      customAnswer: Joi.valid(true, null)
    })
      .or('questionItems', 'customAnswer')
  })
  .when(Joi.object({ questionType: Joi.only('multipleChoice', 'dropdown') }), {
    then: {
      condition: Joi.string().required().valid(...itemsActions, ...fieldActions),
    }
  })
  // checkboxes
  .when(Joi.object({
    questionType: 'checkboxes',
    condition: Joi.only(fieldActions)
  }), {
    then: {
      condition: Joi.string().required().valid(fieldActions),
    }
  })
  .when(Joi.object({
    questionType: 'checkboxes',
    condition: Joi.only(itemsActions)
  }), {
    then: Joi.object({
      condition: Joi.string().valid(itemsActions).required(),
      questionItems: Joi.array().items(Joi.objectId()),
      customAnswer: Joi.valid(true, null)
    })
      .or('questionItems', 'customAnswer')
  })
  .when(Joi.object({
    questionType: 'checkboxes',
    condition: Joi.only(logicActions)
  }), {
    then: {
      condition: Joi.string().required().valid(logicActions),
      count: Joi.number().positive().required(),
    }
  })
  .when(Joi.object({ questionType: 'checkboxes' }), {
    then: {
      condition: Joi.string().required().valid(...itemsActions, ...logicActions, ...fieldActions)
    }
  })
  // slider linearScale netPromoterScore
  .when(Joi.object({
    questionType: Joi.only('slider', 'linearScale', 'netPromoterScore'),
    condition: Joi.only(logicActions)
  }), {
    then: {
      condition: Joi.string().required().valid(logicActions),
      value: Joi.number().required()
    }
  })
  .when(Joi.object({
    questionType: Joi.only('slider', 'linearScale', 'netPromoterScore'),
    condition: Joi.only(fieldActions)
  }), {
    then: {
      condition: Joi.string().required().valid(fieldActions),
    }
  })
  .when(Joi.object({ questionType: Joi.only('slider', 'linearScale', 'netPromoterScore') }), {
    then: {
      condition: Joi.string().required().valid(...logicActions, ...fieldActions)
    }
  })
  // text
  .when(Joi.object({ questionType: 'text', condition: Joi.only(fieldActions) }), {
    then: {
      condition: Joi.string().required().valid(fieldActions),
    }
  })
  .when(Joi.object({ questionType: 'text', condition: Joi.only(textActions) }), {
    then: {
      condition: Joi.string().required().valid(textActions),
      value: Joi.string().required()
    }
  })
  .when(Joi.object({ questionType: 'text' }), {
    then: {
      condition: Joi.string().required().valid(...textActions, ...fieldActions),
    }
  })
  // thumbs
  .when(Joi.object({ questionType: 'thumbs', condition: Joi.only('equal', 'notEqual') }), {
    then: {
      condition: Joi.string().required().valid('equal', 'notEqual'),
      value: Joi.string().required().valid('yes', 'no')
    }
  })
  .when(Joi.object({ questionType: 'thumbs', condition: Joi.only(fieldActions) }), {
    then: {
      condition: Joi.string().required().valid(fieldActions)
    }
  })
  .when(Joi.object({ questionType: 'thumbs' }), {
    then: {
      condition: Joi.string().required().valid('equal', 'notEqual', ...fieldActions),
    }
  })
  // multipleChoiceMatrix and checkboxMatrix
  .when(Joi.object({
    questionType: Joi.only('multipleChoiceMatrix', 'checkboxMatrix'),
    condition: Joi.only(itemsActions)
  }), {
    then: {
      gridRow: Joi.string().required(),
      gridColumn: Joi.string().required(),
      condition: Joi.string().required().valid(itemsActions)
    }
  })
  .when(Joi.object({
    questionType: Joi.only('multipleChoiceMatrix', 'checkboxMatrix'),
    condition: Joi.only(logicActions)
  }), {
    then: Joi.object({
      count: Joi.number().positive().required(),
      condition: Joi.string().required().valid(logicActions),
      gridRow: Joi.string().default(null),
      gridColumn: Joi.string().default(null)
    })
      .or('gridRow', 'gridColumn')
  })
  .when(Joi.object({
    questionType: Joi.only('multipleChoiceMatrix', 'checkboxMatrix'),
    condition: Joi.only(fieldActions)
  }), {
    then: {
      condition: Joi.string().required().valid(fieldActions)
    }
  })
  .when(Joi.object({ questionType: Joi.only('multipleChoiceMatrix', 'checkboxMatrix') }), {
    then: {
      condition: Joi.string().required().valid(...itemsActions, ...logicActions, ...fieldActions)
    }
  })
  // countryList
  .when(Joi.object({
    questionType: 'countryList',
    condition: Joi.only(fieldActions)
  }), {
    then: {
      condition: Joi.string().required().valid(fieldActions),
    }
  })
  .when(Joi.object({
    questionType: 'countryList',
    condition: Joi.only(itemsActions)
  }), {
    then: {
      condition: Joi.string().required().valid(itemsActions),
      country: Joi.objectId().required()
    }
  })
  .when(Joi.object({ questionType: 'countryList' }), {
    then: {
      condition: Joi.string().required().valid(...itemsActions, ...fieldActions),
    }
  })
  // imageChoice
  .when(Joi.object({
    questionType: 'imageChoice',
    condition: Joi.only(fieldActions)
  }), {
    then: {
      condition: Joi.string().required().valid(fieldActions),
    }
  })
  .when(Joi.object({
    questionType: 'imageChoice',
    condition: Joi.only(itemsActions)
  }), {
    then: Joi.object({
      condition: Joi.string().valid(itemsActions).required(),
      questionItems: Joi.array().items(Joi.objectId()),
      customAnswer: Joi.valid(true, null)
    })
      .or('questionItems', 'customAnswer')
  })
  .when(Joi.object({
    questionType: 'imageChoice',
    condition: Joi.only(logicActions)
  }), {
    then: {
      condition: Joi.string().required().valid(logicActions),
      count: Joi.number().positive().required(),
    }
  })
  .when(Joi.object({ questionType: 'imageChoice' }), {
    then: {
      condition: Joi.string().required().valid(...itemsActions, ...logicActions, ...fieldActions)
    }
  });
// PUT /api/v1/drafts - create draft from template or survey
function create(Joi) {
  return {
    body: Joi.object({
      name: Joi.string(),
      defaultLanguage: Joi.string()
        .valid(localizationList)
        .required(),
      surveyType: Joi.string()
        .valid('survey', 'quiz', 'poll', 'pulse')
        .required(),
      type: Joi.string()
        .valid('survey', 'template'),
      customAnimation: Joi.boolean()
    })
  };
}

// PUT /api/v1/drafts/:id - update survey draft
function update(Joi) {
  return {
    params: Joi.object({
      id: Joi.objectId().required()
    }),
    body: Joi.object({
      type: Joi.string().valid('survey', 'template'),
      surveyType: Joi.string().valid('survey', 'quiz', 'poll'),
      name: localizeValidations(Joi, 'general.name'),
      description: Joi.object().keys(localizeValidations(Joi, 'general.description')),
      translation: Joi.object(localizeValidations(Joi, 'general.translation')),
      translationLockName: Joi.object().keys(localizeValidations(Joi, 'general.translationLockName')),
      translationLockDescription: Joi.object().keys(localizeValidations(Joi, 'general.translationLockDescription')),
      startDate: Joi.date().allow(null),
      endDate: Joi.date().allow(null),

      // main settings
      allowReAnswer: Joi.boolean(),
      customAnimation: Joi.boolean(),
      displaySingleQuestion: Joi.boolean(),
      liveData: Joi.boolean(),
      publicPreview: Joi.boolean(),
      distributeByTargets: Joi.boolean(),
      cookiesCheck: Joi.boolean(),
      scoring: Joi.boolean(),
      scoreCondition: Joi.string(),

      // references
      references: Joi.object().keys({
        active: Joi.boolean(),
        content: localizeValidations(Joi, 'surveyItem.html')
      }),

      // footer
      footer: Joi.object().keys({
        text: localizeValidations(Joi, 'survey.text'),
        align: Joi.string().valid('right', 'left', 'center', 'none'),
        active: Joi.boolean(),
        html: Joi.boolean(),
        content: Joi.object().when('html', { is: true, then: localizeValidations(Joi, 'surveyItem.html') }),
      }),

      // timer
      timer: Joi.object().keys({
        active: Joi.boolean(),
        limit: Joi.number(),
        pause: Joi.boolean(),
      }),
      approximateTime: Joi.number().positive().allow(null),

      // quiz
      showResultText: Joi.string().valid('showResult', 'option', 'question', 'none'),
      answersList: Joi.boolean(),
      scorePercentage: Joi.boolean(),

      publicAccess: Joi.boolean(),
      publicTTL: Joi.number().allow(null),
      publicTTLView: Joi.string().allow(null),
      urlName: Joi.string().trim(),
      active: Joi.boolean(),
      scope: Joi.object({
        companies: Joi.array().items(Joi.objectId()),
        global: Joi.boolean()
      })
    })
  };
}

// GET /api/v1/drafts/:id - show draft
function show(Joi) {
  return {
    params: Joi.object({
      id: Joi.objectId().required()
    })
  };
}

// POST /api/v1/drafts/:id edit related to draft entities
function edit(Joi) {
  return {
    params: Joi.object({
      id: Joi.objectId().required()
    }),
    body: Joi.object({
      action: Joi.string().required().valid(actions),
      entity: Joi.string().required().valid(entities),
      entityId: Joi.objectId().when('action', { is: Joi.only('update', 'remove'), then: Joi.required() }),
    })
      .when(Joi.object({ action: 'create', entity: 'surveySection' }), {
        then: Joi.object({
          data: Joi.object({
            pulseSurveyDriver: Joi.objectId(),
            survey: Joi.objectId().required(),
            name: Joi.string()
          })
        })
      })
      .when(Joi.object({ action: 'create', entity: 'surveyItem' }), {
        then: Joi.object({
          data: Joi.object({
            surveySection: Joi.objectId().required(),
            type: Joi.string().required().valid('question', 'trendQuestion'),
            question: Joi.alternatives([
              Joi.string().valid(questionTypes),
              Joi.objectId()
            ]).required(),
            questionInput: Joi.string().valid('number', 'phone', 'email', 'date'),
            questionName: localizeValidations(Joi, 'general.name'),
            questionItemName: localizeValidations(Joi, 'general.name'),
            secondQuestionItemName: localizeValidations(Joi, 'general.name'),
            thirdQuestionItemName: localizeValidations(Joi, 'general.name'),
            gridRowName: localizeValidations(Joi, 'general.name'),
            gridColumnName: localizeValidations(Joi, 'general.name'),
            index: Joi.number(),
            fromCaption: Joi.object().keys(localizeValidations(Joi, 'question.fromCaption')),
            toCaption: Joi.object().keys(localizeValidations(Joi, 'question.toCaption')),
            quizCondition: Joi.string().valid('equal', 'greaterEqual', 'lessEqual', 'isBetween'),
            quizCorrectValue: Joi.alternatives([
              Joi.string().allow(null).allow(''),
              Joi.number()
            ]),
            quizCorrectRange: Joi.object({
              from: Joi.number().allow(null),
              to: Joi.number().allow(null)
            }),
            linearScale: Joi.object({
              from: Joi.number(),
              to: Joi.number(),
              icon: Joi.string().valid(iconTypes)
            })
          })
        })
      })
      .when(Joi.object({ action: 'create', entity: 'contentItem' }), {
        then: Joi.object({
          data: Joi.object({
            index: Joi.number(),
            type: Joi.string().valid('content', 'startPage', 'endPage').required(),
            survey: Joi.objectId().required(),
            contentType: Joi.string().required()
              .when('type', { is: 'content', then: Joi.valid(contentTypes) })
              .when('type', { is: 'startPage', then: Joi.valid(startPageTypes) })
              .when('type', { is: 'endPage', then: Joi.valid(endPageTypes) }),
            // if surveyItem already exists
            surveyItem: Joi.objectId(),

            // if new survey item would be created
            surveySection: Joi.objectId()
              .when('surveyItem', { is: null, then: Joi.required() }),
            surveyItemSortableId: Joi.number()
              .when('surveyItem', { is: null, then: Joi.required() }),
            default: Joi.boolean()
          })
            .when(Joi.object({ contentType: 'titleText' }), { then: Joi.object({
              text: localizeValidations(Joi, 'contentItem.text'),
              title: localizeValidations(Joi, 'contentItem.text'),
              thumbUp: Joi.boolean(),
              score: Joi.boolean()
            }) })
            .when(Joi.object({ contentType: 'title' }), { then: Joi.object({
              title: localizeValidations(Joi, 'contentItem.text')
            }) })
            .when(Joi.object({ contentType: 'text' }), { then: Joi.object({
              text: localizeValidations(Joi, 'contentItem.text')
            }) })
            .when(Joi.object({ contentType: 'image' }), { then: Joi.object({
              dataType: Joi.string().valid('cloudinary', 'unsplash', 'none'),
              dataUrl: Joi.string().when('dataType', { is: Joi.only('cloudinary', 'unsplash'), then: Joi.required() }),
              fill: Joi.string(),
              padding: Joi.string()
            }) })
            .when(Joi.object({ contentType: 'textImage' }), { then: Joi.object({
              text: localizeValidations(Joi, 'contentItem.text'),
              dataType: Joi.string().valid('cloudinary', 'unsplash', 'none'),
              dataUrl: Joi.string().when('dataType', { is: Joi.only('cloudinary', 'unsplash'), then: Joi.required() }),
              fill: Joi.string(),
              padding: Joi.string(),
              reverse: Joi.boolean()
            }) })
            .when(Joi.object({ contentType: 'contentImage' }), { then: Joi.object({
              text: localizeValidations(Joi, 'contentItem.text'),
              title: localizeValidations(Joi, 'contentItem.text'),
              dataType: Joi.string().valid('cloudinary', 'unsplash', 'none'),
              dataUrl: Joi.string().when('dataType', { is: Joi.only('cloudinary', 'unsplash'), then: Joi.required() }),
              fill: Joi.string(),
              padding: Joi.string(),
              reverse: Joi.boolean(),
              socialIcons: Joi.boolean(),
              score: Joi.boolean(),
              thumbUp: Joi.boolean(),
              position: Joi.string().valid('default', 'reverse', 'full', 'column')
            }) })
            .when(Joi.object({ contentType: 'video' }), { then: Joi.object({
              dataType: Joi.string().valid('vimeo', 'youtube', 'none').required(),
              dataUrl: Joi.string(),
              autoplay: Joi.boolean()
            }) })
            .when(Joi.object({ contentType: 'textVideo' }), { then: Joi.object({
              text: localizeValidations(Joi, 'contentItem.text'),
              dataType: Joi.string().valid('vimeo', 'youtube', 'none').required(),
              dataUrl: Joi.string(),
              autoplay: Joi.boolean(),
              reverse: Joi.boolean()
            }) })
            .when(Joi.object({ contentType: 'html' }), { then: Joi.object({
              html: localizeValidations(Joi, 'contentItem.html')
            }) })
        })
      })
      .when(Joi.object({ action: 'create', entity: 'contentItemElement' }), {
        then: Joi.object({
          data: Joi.object({
            contentItem: Joi.objectId().required(),
            type: Joi.string().valid('link').required(),
            value: Joi.string()
          })
        })
      })
      .when(Joi.object({ action: 'create', entity: 'question' }), {
        then: Joi.object({
          data: Joi.object({
            type: Joi.string().valid(questionTypes).required()
          })
        })
      })
      .when(Joi.object({ action: 'create', entity: 'questionItem' }), {
        then: Joi.object({
          data: Joi.object({
            name: Joi.alternatives(
              localizeValidations(Joi, 'general.name'),
              Joi.array().items(Joi.string()).min(1).max(50)
            ),
            question: Joi.objectId().required(),
            deselectOtherOptions: Joi.boolean()
          })
        })
      })
      .when(Joi.object({ action: 'create', entity: 'gridRow' }), {
        then: Joi.object({
          data: Joi.object({
            question: Joi.objectId().required(),
            name: localizeValidations(Joi, 'general.name')
          })
        })
      })
      .when(Joi.object({ action: 'create', entity: 'gridColumn' }), {
        then: Joi.object({
          data: Joi.object({
            question: Joi.objectId().required(),
            name: localizeValidations(Joi, 'general.name')
          })
        })
      })
      .when(Joi.object({ action: 'create', entity: 'flowLogic' }), {
        then: {
          data: Joi.object({
            surveyItem: Joi.objectId().required(),
            method: Joi.string().valid('every', 'some').required(),
            action: Joi.string().valid('endSurvey', 'toSection').required(),
            section: Joi.objectId().when('action', { is: 'toSection', then: Joi.required() }),
            questionType: Joi.string().valid(questionTypes).required()
          })
        }
      })
      .when(Joi.object({ action: 'create', entity: 'displayLogic' }), {
        then: {
          data: Joi.object({
            surveyItem: Joi.objectId().required(),
            method: Joi.string().valid('every', 'some').required(),
          })
        }
      })
      .when(Joi.object({ action: 'create', entity: 'flowItem' }), {
        then: {
          data: flowItemSchema(Joi)
        }
      })
      .when(Joi.object({ action: 'update', entity: 'surveySection' }), {
        then: Joi.object({
          data: Joi.object({
            hide: Joi.boolean(),
            name: localizeValidations(Joi, 'general.name'),
            translationLockName: Joi.object().keys(localizeValidations(Joi, 'general.translationLockName')),
            description: Joi.object().keys(localizeValidations(Joi, 'general.description')),
            translationLockDescription: Joi.object().keys(localizeValidations(Joi, 'general.translationLockDescription')),
            displaySingle: Joi.boolean(),
            index: Joi.number()
          }),
        })
      })
      .when(Joi.object({ action: 'update', entity: 'surveyItem' }), {
        then: Joi.object({
          data: Joi.object({
            hide: Joi.boolean(),
            type: Joi.string().valid('question', 'html', 'trendQuestion'),
            textLimit: Joi.number().positive().allow(null),
            html: Joi.object().when('type', { is: 'html', then: localizeValidations(Joi, 'surveyItem.html') }),
            required: Joi.boolean(),
            notificationMailer: Joi.object({
              active: Joi.boolean(),
              mailer: Joi.objectId(),
              emails: Joi.array().items(Joi.string().email())
            }).allow(null),
            customAnswer: Joi.boolean(),
            minAnswers: Joi.number().positive().allow(null, ''),
            maxAnswers: Joi.number().positive().allow(null, ''),
            index: Joi.number()
          })
        })
      })
      .when(Joi.object({ action: 'update', entity: 'contentItem' }), {
        then: Joi.object({
          data: Joi.object({
            text: localizeValidations(Joi, 'contentItem.text'),
            title: localizeValidations(Joi, 'contentItem.text'),
            html: localizeValidations(Joi, 'contentItem.html'),
            dataType: Joi.valid('cloudinary', 'unsplash', 'vimeo', 'youtube', 'none'),
            dataUrl: Joi.string().allow(''),
            fill: Joi.string(),
            padding: Joi.string(),
            reverse: Joi.boolean(),
            autoplay: Joi.boolean(),
            bgDefault: Joi.boolean(),
            socialIcons: Joi.boolean(),
            score: Joi.boolean(),
            scorePoints: Joi.boolean(),
            thumbUp: Joi.boolean(),
            required: Joi.boolean(),
            position: Joi.string().valid('default', 'reverse', 'full', 'column'),
            index: Joi.number(),
            // externalLinks: Joi.array().items({
            //   _id: Joi.string(),
            //   value: Joi.string(),
            //   link: Joi.string(),
            //   linkText: localizeValidations(Joi, 'contentItem.text')
            // }),
            passTimeActive: Joi.boolean(),
            passTimeLabel: localizeValidations(Joi, 'contentItem.text')
          })
        })
      })
      .when(Joi.object({ action: 'update', entity: 'contentItemElement' }), {
        then: Joi.object({
          data: Joi.object({
            value: Joi.string(),
            link: Joi.string(),
            linkText: localizeValidations(Joi, 'contentItem.text')
          })
        })
      })
      .when(Joi.object({ action: 'update', entity: 'question' }), {
        then: Joi.object({
          data: Joi.object({
            type: Joi.string().valid(questionTypes),
            name: localizeValidations(Joi, 'general.name'),
            hideIcons: Joi.boolean(),
            translation: Joi.object().keys(localizeValidations(Joi, 'general.translation')),
            translationLockName: Joi.object().keys(localizeValidations(Joi, 'general.translationLockName')),
            description: Joi.object().keys(localizeValidations(Joi, 'general.description')),
            translationLockDescription: Joi.object().keys(localizeValidations(Joi, 'general.translationLockDescription')),
            translationLockLinearScaleFromCaption: Joi.object().keys(localizeValidations(Joi, 'question.translationLockLinearScaleFromCaption')),
            translationLockLinearScaleToCaption: Joi.object().keys(localizeValidations(Joi, 'question.translationLockLinearScaleToCaption')),
            defaultCode: Joi.string(),
            randomize: Joi.boolean(),
            quiz: Joi.boolean(),
            quizCondition: Joi.string().valid('equal', 'greaterEqual', 'lessEqual', 'isBetween'),
            quizCorrectValue: Joi.alternatives([
              Joi.string().allow(null).allow(''),
              Joi.number()
            ]),
            quizCorrectRange: Joi.object({
              from: Joi.number().allow(null),
              to: Joi.number().allow(null)
            }),
            quizCorrectText: Joi.object().keys(localizeValidations(Joi, 'surveyItem.html')),
            quizIncorrectText: Joi.object().keys(localizeValidations(Joi, 'surveyItem.html')),
            verticalAlignment: Joi.boolean()
          })
            .when(Joi.object({ type: 'text' }), { then: Joi.object({
              placeholder: Joi.object().keys(localizeValidations(Joi, 'question.placeholder')),
              linearScale: Joi.object({
                from: Joi.number().allow(null),
                to: Joi.number().allow(null)
              }),
              dateParams: Joi.object({
                type: Joi.string().valid('date', 'dateAndTime', 'range', 'rangeAndTime'),
                dateFormat: Joi.string().valid('ddmmyyyy', 'mmddyyyy', 'yyyymmdd'),
                timeFormat: Joi.string().valid('twelveHourFormat', 'twentyFourHourFormat'),
                startDate: Joi.string().allow(null),
                startTime: Joi.string().allow(null),
                endDate: Joi.string().allow(null),
                endTime: Joi.string().allow(null),
                default: Joi.boolean()
              }),
              input: Joi.string().valid('email', 'phone', 'number', 'date').allow(null)
            }) })
            .when(Joi.object({ type: 'linearScale' }), { then: Joi.object({
              linearScale: Joi.object({
                from: Joi.number(),
                fromCaption: Joi.object().keys(localizeValidations(Joi, 'question.fromCaption')),
                to: Joi.number(),
                toCaption: Joi.object().keys(localizeValidations(Joi, 'question.toCaption')),
                icon: Joi.string().valid(iconTypes)
              }),
              scoreObj: Joi.object().pattern(/^value/, Joi.number())
            }) })
            .when(Joi.object({ type: 'slider' }), { then: Joi.object({
              linearScale: Joi.object({
                from: Joi.number(),
                fromCaption: Joi.object().keys(localizeValidations(Joi, 'question.fromCaption')),
                to: Joi.number(),
                toCaption: Joi.object().keys(localizeValidations(Joi, 'question.toCaption')),
              })
            }) })
            .when(Joi.object({ type: 'netPromoterScore' }), { then: Joi.object({
              linearScale: Joi.object({
                fromCaption: Joi.object().keys(localizeValidations(Joi, 'question.fromCaption')),
                toCaption: Joi.object().keys(localizeValidations(Joi, 'question.toCaption')),
              }),
              textComment: Joi.boolean(),
              detractorsComment: localizeValidations(Joi, 'general.name'),
              detractorsPlaceholder: localizeValidations(Joi, 'question.placeholder'),
              passivesComment: localizeValidations(Joi, 'general.name'),
              passivesPlaceholder: localizeValidations(Joi, 'question.placeholder'),
              promotersComment: localizeValidations(Joi, 'general.name'),
              promotersPlaceholder: localizeValidations(Joi, 'question.placeholder')
            }) })
            .when(Joi.object({ type: 'thumbs' }), { then: Joi.object({
              linearScale: Joi.object({
                fromCaption: Joi.object().keys(localizeValidations(Joi, 'question.fromCaption')),
                toCaption: Joi.object().keys(localizeValidations(Joi, 'question.toCaption'))
              }),
              scoreObj: Joi.object({
                yes: Joi.number(),
                no: Joi.number()
              })
            }) })
            .when(Joi.object({ type: 'imageChoice' }), { then: Joi.object({
              multipleChoice: Joi.boolean(),
              scoreObj: Joi.object({ customAnswer: Joi.string() })
            }) })
            .when(Joi.object({ type: 'checkboxes' }), { then: Joi.object({
              scoreObj: Joi.object({ customAnswer: Joi.number() })
            }) })
            .when(Joi.object({ type: 'multipleChoice' }), { then: Joi.object({
              scoreObj: Joi.object({ customAnswer: Joi.number() })
            }) })
        })
      })
      .when(Joi.object({ action: 'update', entity: 'questionItem' }), {
        then: Joi.object({
          data: Joi.object({
            question: Joi.objectId(),
            quizCorrect: Joi.boolean(),
            quizResultText: localizeValidations(Joi, 'questionItem.quizResultText'),
            name: localizeValidations(Joi, 'general.name'),
            index: Joi.number(),
            dataType: Joi.valid('cloudinary', 'unsplash', 'gallery', 'none'),
            icon: Joi.string().valid(...itemIconTypes),
            bgImage: Joi.string(),
            score: Joi.number().min(0),
            giphyId: Joi.string().allow(null),
            unsplashUrl: Joi.string().allow(null),
            imgCloudinary: Joi.alternatives([
              Joi.object().required(),
              Joi.string().required()
            ])
          })
        })
      })
      .when(Joi.object({ action: 'update', entity: 'gridRow' }), {
        then: Joi.object({
          data: Joi.object({
            question: Joi.objectId(),
            score: Joi.number(),
            name: localizeValidations(Joi, 'general.name'),
            index: Joi.number()
          }),
        })
      })
      .when(Joi.object({ action: 'update', entity: 'gridColumn' }), {
        then: Joi.object({
          data: Joi.object({
            question: Joi.objectId(),
            score: Joi.number(),
            name: localizeValidations(Joi, 'general.name'),
            index: Joi.number()
          }),
        })
      })
      .when(Joi.object({ action: 'update', entity: 'flowLogic' }), {
        then: Joi.object({
          data: Joi.object({
            method: Joi.string().valid('every', 'some'),
            action: Joi.string().valid('endSurvey', 'toSection'),
            endPage: Joi.objectId().default(null),
            section: Joi.objectId().when('action', { is: 'toSection', then: Joi.required() }),
            index: Joi.number()
          })
        })
      })
      .when(Joi.object({ action: 'update', entity: 'displayLogic' }), {
        then: Joi.object({
          data: Joi.object({
            conditionSurveyItem: Joi.objectId(),
            method: Joi.string().valid('every', 'some'),
            display: Joi.boolean(),
            index: Joi.number()
          })
        })
      })
      .when(Joi.object({ action: 'update', entity: 'flowItem' }), {
        then: Joi.object({
          data: flowItemSchema(Joi)
        })
      })
      .when(Joi.object({ action: 'update', entity: 'pulseSurveyDriver' }), {
        then: Joi.object({
          data: Joi.object({
            icon: Joi.string().valid(pulseSurveyDriverIconTypes),
            active: Joi.boolean(),
            minPositiveValue: Joi.number(),
            maxPositiveValue: Joi.number(),
            description: Joi.string(),
            name: Joi.string().allow('')
          })
        })
      })
      .when(Joi.object({ action: 'remove', entity: 'questionItem' }), {
        then: Joi.object({
          surveyItemId: Joi.objectId().required()
        })
      })
      .when(Joi.object({ action: 'remove', entity: 'gridRow' }), {
        then: Joi.object({
          surveyItemId: Joi.objectId().required()
        })
      })
      .when(Joi.object({ action: 'remove', entity: 'gridColumn' }), {
        then: Joi.object({
          surveyItemId: Joi.objectId().required()
        })
      })
  };
}

// POST /api/v1/drafts/convert-question - convert trend question to regular
function convertQuestion(Joi) {
  return {
    body: Joi.object({
      surveyItemId: Joi.objectId().required()
    })
  };
}

// POST /api/v1/drafts/clone-survey-section - clone survey section
function cloneSurveySection(Joi) {
  return {
    body: Joi.object({
      surveySectionId: Joi.objectId()
        .required(),
      index: Joi.number()
        .required()
    })
  };
}

// POST /api/v1/drafts/clone-survey-item - clone survey item
function cloneSurveyItem(Joi) {
  return {
    body: Joi.object({
      surveyItemId: Joi.objectId().required()
    })
  };
}

// POST /api/v1/drafts/clone-content-item - clone content item
function cloneContentItem(Joi) {
  return {
    body: Joi.object({
      contentItemId: Joi.objectId().required()
    })
  };
}

// POST /api/v1/drafts/clone-driver - clone pulse survey driver
function cloneDriver(Joi) {
  return {
    body: Joi.object({
      driverId: Joi.objectId().required()
    })
  };
}

// POST /api/v1/drafts/move-survey-item - move survey item to another section
function moveSurveyItem(Joi) {
  return {
    body: Joi.object({
      surveySection: Joi.objectId().required(),
      surveyItem: Joi.objectId().required()
    })
  };
}

// POST /1pi/v1/drafts/divide/:id - move existing survey item content to new survey item
function divide(Joi) {
  return {
    params: Joi.object({
      id: Joi.objectId().required()
    }),
    body: Joi.object({
      surveySection: Joi.objectId().required(),
      contentId: Joi.objectId().required(),
      index: Joi.number().required()
    })
  };
}

// POST /api/v1/drafts/switch-page/:id - switch default start/end page
function switchPage(Joi) {
  return {
    params: Joi.object({
      id: Joi.objectId().required()
    }),
    body: Joi.object({
      entityId: Joi.objectId().required(),
      type: Joi.string().valid('startPage', 'endPage').required()
    })
  };
}

// POST /api/v1/drafts/apply/:id - apply draft
function apply(Joi) {
  return {
    params: Joi.object({
      id: Joi.objectId().required()
    })
  };
}

// POST /api/v1/drafts/remove/:id - remove draft
function remove(Joi) {
  return {
    params: Joi.object({
      id: Joi.objectId().required()
    })
  };
}

// GET /api/v1/drafts/check-translation/:id - count fields to translate
function checkTranslation(Joi) {
  return {
    params: Joi.object({
      id: Joi.objectId().required()
    })
  };
}

// GET /api/v1/drafts/count-score/:id - count maximum score
function countScorePoints(Joi) {
  return {
    params: Joi.object({
      id: Joi.objectId().required()
    })
  };
}

export default {
  create,
  update,
  show,
  apply,
  convertQuestion,
  cloneSurveySection,
  moveSurveyItem,
  cloneContentItem,
  cloneDriver,
  divide,
  switchPage,
  edit,
  cloneSurveyItem,
  remove,
  checkTranslation,
  countScorePoints
};
