import chalk from 'chalk';
import moment from 'moment';

// models
import {
  Survey,
  SurveyItem,
  SurveyResult,
  QuestionStatistic,
  AnalyticNotification
} from '../models';

// create analytic notifications by question and replies data
export default async function analyticNotifications() {
  try {
    // build specific ranges
    const ranges = _buildRanges();

    // create cursor for surveys
    const cursor = Survey.model
      .find({
        type: 'survey',
        lastAnswerDate: {
          $gte: moment().subtract(1, 'month').toDate(),
          $lte: moment().toDate()
        }
      })
      .select('_id company team surveyType')
      .lean()
      .cursor();

    for (let survey = await cursor.next(); survey != null; survey = await cursor.next()) {
      // get survey items for notifications
      const surveyItems = await _loadSurveyItems(survey._id);

      // TODO rework to async ?
      for (const { range, prevRange, period } of ranges) {
        // TODO init notifications data array ?
        for (const surveyItem of surveyItems) {
          const [
            currItemData,
            prevItemData
          ] = await Promise.all([
            _loadQuestionStatisticData(surveyItem._id, range),
            _loadQuestionStatisticData(surveyItem._id, prevRange)
          ]);

          // compare current and previous data, create notifications
          await _createQuestionNotification(surveyItem, currItemData, prevItemData, period, range);
        }

        const [
          currRepliesData,
          prevRepliesData,
        ] = await Promise.all([
          _loadSurveyResultsData(survey, range),
          _loadSurveyResultsData(survey, prevRange)
        ]);

        // compare current and previous data, create notifications
        await _createRepliesNotification(survey, currRepliesData, prevRepliesData, period, range);
      }
    }

    console.log(chalk.green('Analytic notifications created...'));
  } catch (e) {
    console.error(chalk.red(`Analytic notifications cron error: ${e}`));
  }
}

// load survey item for analyze and create notifications
async function _loadSurveyItems(survey) {
  try {
    // TODO handle matrix questions
    const questionTypes = [
      'countryList',
      'thumbs',
      'dropdown',
      'checkboxes',
      'multipleChoice',
      'slider',
      'linearScale',
      'netPromoterScore'
    ];

    // load question/trendQuestion survey items
    const surveyItems = await SurveyItem.model
      .find({
        survey,
        type: { $in: ['question', 'trendQuestion'] },
        inDraft: { $ne: true },
        inTrash: { $ne: true }
      })
      .sort({ createdAt: 1 })
      .select('_id company team question survey createdAt')
      .populate({
        path: 'question',
        populate: {
          path: 'questionItems',
          match: {
            inDraft: { $ne: true },
            inTrash: { $ne: true }
          }
        }
      })
      .lean();

    // filter questions for notifications
    return surveyItems
      .filter(i => i.question && questionTypes.includes(i.question.type));
  } catch (e) {
    return Promise.reject(e);
  }
}

// load and accumulate data from question statistic
async function _loadQuestionStatisticData(surveyItem, range) {
  try {
    // init cursor
    const cursor = QuestionStatistic.model
      .find({
        surveyItem,
        syncDB: true,
        time: {
          $gte: range.from,
          $lte: range.to
        }
      })
      .select('data')
      .lean()
      .cursor();

    // init accumulator
    const acc = {};

    // iterate cursor and accumulate data
    for (let statistic = await cursor.next(); statistic != null; statistic = await cursor.next()) {
      const { data = {} } = statistic;

      Object.keys(data).forEach((key) => {
        acc[key] = (acc[key] || 0) + data[key];
      });
    }

    return acc;
  } catch (e) {
    return Promise.reject(e);
  }
}

// load and accumulate data by survey results
async function _loadSurveyResultsData(survey, range) {
  try {
    // TODO rework to aggregate with group ?
    // init cursor
    const cursor = SurveyResult.model
      .find({
        survey: survey._id,
        empty: { $ne: true },
        hide: { $ne: true },
        createdAt: {
          $gte: range.from,
          $lte: range.to
        }
      })
      // .select('')
      .lean()
      .cursor();

    // init accumulator
    const acc = {
      started: 0,
      completed: 0,
      quizTotal: 0,
      countries: {},
      cities: {}
    };

    // iterate cursor and accumulate data
    for (let result = await cursor.next(); result != null; result = await cursor.next()) {
      const {
        // device,
        quizTotal,
        empty,
        completed,
        location = {},
      } = result;

      acc.started += empty ? 0 : 1;
      acc.completed += completed ? 1 : 0;

      if (location.country) {
        acc.countries[location.country] = (acc.countries[location.country] || 0) + 1;
      }
      if (location.city) acc.cities[location.city] = (acc.cities[location.city] || 0) + 1;
      if (completed && survey.surveyType === 'quiz') acc.quizTotal += quizTotal;
    }

    return acc;
  } catch (e) {
    return Promise.reject(e);
  }
}

// create question notification by given accumulated data
async function _createQuestionNotification(surveyItem, curr, prev, period, { from, to }) {
  try {
    const questionType = surveyItem.question.type;
    const type = { // question notification type
      countryList: 'mostSelectedCountry',
      thumbs: 'mostSelectedValue',
      dropdown: 'mostSelectedOption',
      checkboxes: 'mostSelectedOption',
      multipleChoice: 'mostSelectedOption',
      slider: 'meanValue',
      linearScale: 'meanValue',
      netPromoterScore: 'meanValue'
    }[questionType];

    let notificationData;

    if (['countryList', 'thumbs', 'dropdown', 'checkboxes', 'multipleChoice'].includes(questionType)) {
      const currMostSelected = _getMostSelectedOption(curr); // get most selected by current range
      const prevMostSelected = _getMostSelectedOption(prev); // get most selected by previous range

      // if most selected option changed compare to previous period fill notification data
      if ((!!currMostSelected && !!prevMostSelected) && (currMostSelected !== prevMostSelected)) {
        notificationData = {
          period,
          from,
          to,
          type,
          surveyItem: surveyItem._id,
          survey: surveyItem.survey,
          team: surveyItem.team,
          company: surveyItem.company
        };

        if (questionType === 'countryList') notificationData.country = currMostSelected;
        if (questionType === 'thumbs') notificationData.value = currMostSelected;
        if (['dropdown', 'checkboxes', 'multipleChoice'].includes(questionType)) {
          notificationData.questionItem = currMostSelected;
        }
      }
    }

    // if mean answer value changed compare to previous period fill notification data
    if (['slider', 'linearScale', 'netPromoterScore'].includes(questionType)) {
      const currMeanValue = _getMeanValue(curr);
      const prevMeanValue = _getMeanValue(prev);

      if (currMeanValue && prevMeanValue) {
        const coefficient = _getDeviation(currMeanValue, prevMeanValue);

        if (Math.abs(coefficient) > 50) {
          notificationData = {
            period,
            from,
            to,
            type,
            surveyItem: surveyItem._id,
            survey: surveyItem.survey,
            team: surveyItem.team,
            company: surveyItem.company,
            coefficient: coefficient.toPrecision(3)
          };
        }
      }
    }

    // create batch of notifications
    if (notificationData) await AnalyticNotification.model.create(notificationData);
  } catch (e) {
    return Promise.reject(e);
  }
}

// create replies notification by given accumulated data
async function _createRepliesNotification(survey, curr, prev, period, { from, to }) {
  try {
    const notificationData = [];

    // compare started and completed counters
    [
      'started',
      'completed'
    ].forEach((key) => {
      const coefficient = _getDeviation(curr[key], prev[key]);

      // if deviation coefficient changed to match create new notification
      if (Math.abs(coefficient) > 30) {
        notificationData.push({
          period,
          from,
          to,
          type: key,
          survey: survey._id,
          company: survey.company,
          team: survey.team,
          coefficient
        });
      }
    });

    if (survey.surveyType === 'quiz') {
      // TODO count mean quiz total deviation
    }

    // TODO deviation by each country/city ?
    // _.uniq(
    //   ...Object.keys(curr.countries),
    //   ...Object.keys(prev.countries)
    // ).forEach((key) => {
    //   const coefficient = _getDeviation(
    //     curr.countries[key],
    //     prev.countries[key]
    //   );
    //
    //   if (Math.abs(coefficient) > 30) {
    //     notificationData.push({
    //       period,
    //       from,
    //       to,
    //       survey,
    //       coefficient,
    //     });
    //   }
    // });
    //
    // _.uniq(
    //   ...Object.keys(curr.cities),
    //   ...Object.keys(prev.cities)
    // ).forEach((key) => {
    //   const coefficient = _getDeviation(
    //     curr.cities[key],
    //     prev.cities[key]
    //   );
    //
    //   if (Math.abs(coefficient) > 30) {
    //     notificationData.push({
    //       period,
    //       survey,
    //       coefficient,
    //       city: key
    //     });
    //   }
    // });

    const currMostSelectedCountry = _getMostSelectedOption(curr.countries);
    const prevMostSelectedCountry = _getMostSelectedOption(prev.countries);

    // create notification by most given country locations
    if (
      (!!currMostSelectedCountry && !!prevMostSelectedCountry)
      && (currMostSelectedCountry !== prevMostSelectedCountry)
    ) {
      notificationData.push({
        period,
        survey: survey._id,
        company: survey.company,
        team: survey.team,
        type: 'locationCountry',
        value: currMostSelectedCountry
      });
    }

    const currMostSelectedCity = _getMostSelectedOption(curr.cities);
    const prevMostSelectedCity = _getMostSelectedOption(prev.cities);

    // create notification by most given city locations
    if (
      (!!currMostSelectedCity && !!prevMostSelectedCity) &&
      (currMostSelectedCity !== prevMostSelectedCity)
    ) {
      notificationData.push({
        period,
        survey: survey._id,
        company: survey.company,
        team: survey.team,
        type: 'locationCity',
        value: currMostSelectedCity
      });
    }

    // create batch of notifications
    if (notificationData.length) await AnalyticNotification.model.create(notificationData);
  } catch (e) {
    return Promise.reject(e);
  }
}

// count deviation between two values
function _getDeviation(currValue, prevValue) {
  if (!currValue || !prevValue) return;

  return ((currValue - prevValue) / prevValue) * 100;
}

// find max value in object
function _getMostSelectedOption(data) {
  let mostSelected;

  Object.keys(data).forEach((key) => {
    if (!mostSelected || (data[key] > data[mostSelected])) mostSelected = key;
  });

  return mostSelected;
}

// count mean value in object
function _getMeanValue(data) {
  let n = 0;
  let sum = 0;

  Object.keys(data).forEach((key) => {
    n += data[key];
    sum += data[key] * parseInt(key, 10);
  });

  return sum / n;
}

// build three period ranges
function _buildRanges() {
  return [
    {
      period: 'days',
      range: { // last three days
        to: moment().endOf('day').toDate(),
        from: moment().subtract(2, 'day').startOf('day').toDate()
      },
      prevRange: { // prev last three days
        to: moment().subtract(3, 'day').endOf('day').toDate(),
        from: moment().subtract(5, 'day').startOf('day').toDate(),
      }
    },
    {
      period: 'week',
      range: { // last week
        to: moment().endOf('day').toDate(),
        from: moment().subtract(7, 'day').startOf('day').toDate()
      },
      prevRange: { // prev week
        to: moment().subtract(8, 'day').endOf('day').toDate(),
        from: moment().subtract(15, 'day').startOf('day').toDate()
      }
    },
    {
      period: 'month',
      range: {
        to: moment().endOf('day').toDate(),
        from: moment().subtract(28, 'day').startOf('day').toDate()
      },
      prevRange: {
        to: moment().subtract(29, 'day').endOf('day').toDate(),
        from: moment().subtract(57, 'day').startOf('day').toDate()
      }
    }
  ];
}
