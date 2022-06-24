import chalk from 'chalk';
import async from 'async';

// models
import {
  QuestionStatistic,
  SurveyResult
} from '../models';

// recount questionStatistic
export default async function recountQuestionStatistic() {
  try {
    // find uncounted entities
    const entities = await QuestionStatistic.model
      .find({ syncDB: false })
      .select('time surveyItem pulseSurveyRound pulseSurveyDriver target tagsString')
      .limit(1000);
    const accFill = (field, acc) => (acc[field] || 0) + 1;

    // recount each entity
    await async.eachLimit(entities, 5, (stat, cb) => {
      const { time, surveyItem, pulseSurveyRound, target, surveyCampaign, tagsString } = stat;

      const query = {
        $or: [
          { [`answer.${surveyItem}`]: { $exists: true } }, // where answer exists
          { 'answer.skipped': surveyItem.toString() }, // or surveyItem in array of skipped questions
          { 'answer.skippedByFlow': surveyItem.toString() } // or skipped by flow logic
        ],
        createdAt: {
          $gte: time,
          $lte: new Date(new Date(time).setMinutes(59, 59, 999))
        },
        preview: { $ne: true },
        hide: { $ne: true }
      };

      if (pulseSurveyRound) query.pulseSurveyRound = pulseSurveyRound;
      if (surveyCampaign) query.surveyCampaign = surveyCampaign;
      if (target) query.target = target;
      if (tagsString) query.tagsString = tagsString;

      // find surveyResults
      SurveyResult.model
        .find(query)
        .select(`answer.${surveyItem} answer.skipped answer.skippedByFlow`)
        .lean()
        .then((results) => {
          if (!results.length) {
            stat.remove()
              .then(() => cb())
              .catch(cb);
          } else {
            // count skipped for question
            stat.skipped = results
              .filter(r => r.answer.skipped && r.answer.skipped.includes(surveyItem.toString()))
              .length;

            stat.skippedByFlow = results
              .filter(r => r.answer.skippedByFlow
                && r.answer.skippedByFlow.includes(surveyItem.toString()))
              .length;

            const answers = results
              .filter(result => result.answer && result.answer[surveyItem]);

            stat.answered = answers.length;

            // accumulate answers data from results
            stat.data = answers
              .reduce((acc, result) => {
                const {
                  questionItems = [],
                  crossings = [],
                  customAnswer,
                  country,
                  value
                } = result.answer[surveyItem];

                if (crossings.length) crossings.forEach((i) => { acc[`${i.gridRow}#${i.gridColumn}`] = accFill(`${i.gridRow}#${i.gridColumn}`, acc); });
                if (questionItems.length) {
                  let items;
                  if (typeof questionItems === 'string') {
                    items = [questionItems];
                  } else {
                    items = questionItems;
                  }
                  items.forEach((i) => { acc[i] = accFill(i, acc); });
                }
                if (customAnswer) acc.customAnswer = accFill('customAnswer', acc);
                if (country) acc[country] = accFill(country, acc);
                if (value || value === 0) acc[value] = accFill(value, acc);

                return acc;
              }, {});
            stat.syncDB = true;
            stat.markModified('data');
            stat.save()
              .then(() => cb())
              .catch(cb);
          }
        })
        .catch(cb);
    });

    console.log(chalk.green(`Recount ${entities.length} questions statistic`));
  } catch (e) {
    console.log(chalk.red(`Recount statistic error: ${e}`));
  }
}
