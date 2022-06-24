import _ from 'lodash';

// function that return next round surveyItems for recipient in pulse survey
// depends on old round data and current round campaign
// recipient should get random question from each driver at least once
// recipient should not get the same questions if still have not answered from campaign
// campaign should cover all questions to participants in round as possible
export default function generateRoundCandidates (options = {}) {
  const {
    pulseSurveyDrivers,
    questionPerSurvey,
    recipient,
    surveyItems,
    currentSurveyItemsMap
  } = options;

  // get arrays of drivers depends on questionPerSurvey
  // every driver should appear at list once
  const driverIds = [];
  _.times(questionPerSurvey, () => {
    _generateDriversArray(questionPerSurvey, pulseSurveyDrivers, driverIds);
  });

  // generate surveyItemsMap by drivers
  const resultIds = {};
  for (const driverId of driverIds) {
    _generateSurveyItemsMap({
      driverId,
      recipient,
      surveyItems,
      resultIds,
      currentSurveyItemsMap
    });
  }

  return resultIds;
}

function _generateDriversArray (questionPerSurvey, pulseSurveyDrivers, driverIds) {
  const driverId = _.sample(pulseSurveyDrivers)._id;
  // if not present push id to array
  if (!driverIds.includes(driverId)) return driverIds.push(driverId);
  // if present check if all drivers is already present
  const allIsPresent = pulseSurveyDrivers.every(i => driverIds.includes(i._id));
  if (allIsPresent) return driverIds.push(driverId);
  // retry
  return _generateDriversArray(questionPerSurvey, pulseSurveyDrivers, driverIds);
}

// generate surveyItems to receipt by driverIds
function _generateSurveyItemsMap (options) {
  const {
    driverId,
    recipient,
    surveyItems,
    resultIds,
    currentSurveyItemsMap
  } = options;
  const { surveyItemsMap } = recipient;

  // check if user still remain options
  let noMoreItems = surveyItems.every(sI => surveyItemsMap[sI._id]);
  // if no more items for user - drop map and get random remain item from round
  if (noMoreItems) {
    // drop rec map
    for (const prop of Object.getOwnPropertyNames(recipient.surveyItemsMap)) {
      delete recipient.surveyItemsMap[prop];
    }
  }

  // check if current round still remain options
  noMoreItems = surveyItems.every(sI => currentSurveyItemsMap[sI._id]);
  // if no more items for user - drop map and get random remain item from round
  if (noMoreItems) {
    // drop campaign map
    for (const prop of Object.getOwnPropertyNames(options.currentSurveyItemsMap)) {
      delete options.currentSurveyItemsMap[prop];
    }
  }

  // get all surveyItems by current driver that are not included
  // in current and participant map
  const surveyItemsByDriver = surveyItems
    .filter((sI) => {
      return sI.pulseSurveyDriver.toString() === driverId.toString()
        && !surveyItemsMap[sI._id] // check on user map
        && !currentSurveyItemsMap[sI._id] // check on round map
        && !resultIds[sI._id]; // check if already in result
    });

  // if possible to add new item with current driver
  if (surveyItemsByDriver.length) {
    // get random survey item
    const surveyItemId = _.sample(surveyItemsByDriver)._id;

    // set item to result and maps
    surveyItemsMap[surveyItemId] = true;
    currentSurveyItemsMap[surveyItemId] = true;
    resultIds[surveyItemId] = true;
    return;
  }

  // get remain items in any other driver
  let remainItems = surveyItems.filter(sI => (
    !surveyItemsMap[sI] && !currentSurveyItemsMap[sI] && !resultIds[sI._id]
  ));

  // if possible - get random and push
  if (remainItems.length) {
    // get random survey item
    const surveyItemId = _.sample(remainItems)._id;

    // set item to result and maps
    surveyItemsMap[surveyItemId] = true;
    currentSurveyItemsMap[surveyItemId] = true;
    resultIds[surveyItemId] = true;
    return;
  }

  // if not possible to add any surveyItem -
  // check user possible items
  remainItems = surveyItems.filter(sI => !surveyItemsMap[sI] && !resultIds[sI._id]);

  // if possible add item to maps
  if (remainItems.length) {
    // get random survey item
    const surveyItemId = _.sample(remainItems)._id;

    // set item to result and maps
    surveyItemsMap[surveyItemId] = true;
    currentSurveyItemsMap[surveyItemId] = true;
    resultIds[surveyItemId] = true;
    return;
  }

  // check if round have items
  remainItems = surveyItems
    .filter(sI => !currentSurveyItemsMap[sI] && !resultIds[sI._id]);
  if (remainItems.length) {
    // get random survey item
    const surveyItemId = _.sample(remainItems)._id;

    // set item to result and maps
    surveyItemsMap[surveyItemId] = true;
    currentSurveyItemsMap[surveyItemId] = true;
    resultIds[surveyItemId] = true;
    return;
  }

  // get random item that is not present in current array
  remainItems = surveyItems.filter(sI => !resultIds[sI._id]);

  if (remainItems.length) {
    // get random survey item
    const surveyItemId = _.sample(remainItems)._id;

    // set item to result and maps
    surveyItemsMap[surveyItemId] = true;
    currentSurveyItemsMap[surveyItemId] = true;
    resultIds[surveyItemId] = true;
  }
}
