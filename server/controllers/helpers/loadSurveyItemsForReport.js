import {
  PulseSurveyDriver,
  Survey
} from '../../models';

export default async function loadSurveyItemsForReport(surveyId, surveyItemId, drivers) {
  try {
    const surveyDoc = await Survey.model
      .findOne({ _id: surveyId })
      .populate({
        path: 'surveySections',
        select: '-createdAt -updatedAt -__v',
        populate: {
          path: 'surveyItems',
          select: '-createdAt -updatedAt -__v',
          populate: {
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
          }
        }
      })
      .lean();

    if (!surveyDoc) return;

    if (surveyDoc.surveyType === 'pulse') {
      const pulseSurveyDrivers = await PulseSurveyDriver.model
        .find({
          survey: surveyId,
          inDraft: { $ne: true },
          draftRemove: { $ne: true }
          // active: true
        })
        .sort('sortableId')
        .lean();

      let sortedSections = [];

      pulseSurveyDrivers.forEach((driver) => {
        sortedSections = [
          ...sortedSections,
          ...surveyDoc.surveySections
            .filter(item => driver._id.toString() === item.pulseSurveyDriver.toString())
            .sort((a, b) => (a.sortableId - b.sortableId))
        ];
      });

      surveyDoc.surveySections = sortedSections;
    }

    let surveyItems = surveyDoc.surveySections
      .reduce((acc, { surveyItems = [] }) => [
        ...acc,
        ...surveyItems
          .filter(item => ['question', 'trendQuestion'].includes(item.type))
          .sort((a, b) => (a.sortableId - b.sortableId))
      ], []);

    if (surveyItemId) surveyItems = surveyItems.filter(i => i._id.toString() === surveyItemId);

    if (drivers && drivers.length) {
      const driversIds = drivers.map(driver => driver.toString());

      surveyItems = surveyItems
        .filter(item => driversIds.includes(item.pulseSurveyDriver.toString()));
    }

    return surveyItems;
  } catch (e) {
    return Promise.reject(e);
  }
}
