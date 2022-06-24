import Survey from '../../models/Survey';

// TODO check params to send
/**
 * Load survey and all related data by current step
 * @param  {string} surveyId
 * @param  {number} step
 * @return {model}
 */
export default async function loadSurveyDataByStep(surveyId, step) {
  return await Survey.model
    .findById(surveyId)
    .populate([
      {
        path: 'surveySection',
        select: '-createdAt -updatedAt -__v',
        match: {
          step,
          hide: { $ne: true },
          inDraft: { $ne: true }
        },
        populate: [
          {
            path: 'surveyItems',
            select: '-createdAt -updatedAt -__v',
            match: {
              hide: { $ne: true },
              inTrash: { $ne: true },
              inDraft: { $ne: true }
            },
            populate: [
              {
                path: 'question',
                select: '-createdAt -updatedAt -__v -quizMultiAnswer',
                populate: [
                  {
                    path: 'questionItems',
                    select: '-createdAt -updatedAt -__v -quizCorrect -quizResultText -quizResultTextTranslationLock',
                    match: {
                      inTrash: { $ne: true },
                      inDraft: { $ne: true }
                    }
                  },
                  {
                    path: 'gridRows',
                    select: 'createdAt team name translationLock type',
                    match: {
                      inTrash: { $ne: true },
                      inDraft: { $ne: true }
                    }
                  },
                  {
                    path: 'gridColumns',
                    select: 'createdAt team name translationLock type',
                    match: {
                      inTrash: { $ne: true },
                      inDraft: { $ne: true }
                    }
                  },
                ]
              },
              {
                path: 'contents',
                inTrash: { $ne: true },
                inDraft: { $ne: true }
              }
            ]
          }
        ]
      },
      {
        path: 'company',
        select: 'logo colors'
      },
      {
        path: 'surveyCompleteMailer',
        select: 'subject template'
      },
      {
        path: 'surveyInvitationMailer',
        select: 'subject template'
      },
      {
        path: 'surveyTheme'
      }
    ])
    .lean();
}
