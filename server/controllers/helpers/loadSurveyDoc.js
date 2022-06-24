import Survey from '../../models/Survey';

/**
 * Load survey and all related data by current step
 * @param  {object} query
 * @return {model}
 */
export default async function loadSurveyDoc(query) {
  return await Survey.model
    .findOne(query)
    .populate([
      {
        path: 'surveySections',
        select: '-createdAt -updatedAt -__v',
        populate: [
          {
            path: 'surveyItems',
            select: '-createdAt -updatedAt -__v',
            populate: [
              {
                path: 'question',
                select: '-createdAt -updatedAt -__v',
                populate: [
                  {
                    path: 'questionItems',
                    select: '-createdAt -updatedAt -__v'
                  },
                  {
                    path: 'gridRows',
                    select: '-createdAt -updatedAt -__v',
                  },
                  {
                    path: 'gridColumns',
                    select: '-createdAt -updatedAt -__v',
                  },
                ]
              },
              {
                path: 'contents',
                select: '-createdAt -updatedAt -__v'
              },
              {
                path: 'notificationMailer.mailer',
                select: 'name _id'
              },
              {
                path: 'flowLogic',
                populate: {
                  path: 'flowItems'
                }
              },
              {
                path: 'displayLogic',
                populate: {
                  path: 'flowItems'
                }
              }
            ]
          },
          {
            path: 'pulseSurveyDriver'
          }
        ]
      },
      {
        path: 'startPages',
        select: '-createdAt -updatedAt -__v'
      },
      {
        path: 'endPages',
        select: '-createdAt -updatedAt -__v',
        populate: [
          {
            path: 'flowItem',
            select: '-createdAt -updatedAt -__v',
          },
          {
            path: 'contentItemElements'
          }
        ]
      },
      {
        path: 'surveyTheme',
        select: '-createdAt -updatedAt -__v'
      },
      {
        path: 'pulseSurveyDrivers'
      }
    ])
    .lean();
};
