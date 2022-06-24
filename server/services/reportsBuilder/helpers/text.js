import chalk from 'chalk';

// models
import {
  SurveyResult,
  QuestionStatistic
} from '../../../models';

// helpers
import wordFrequency from '../../../helpers/wordFrequency';

export default async function processTextQuestion(options = {}) {
  try {
    const { data = [], aggregate, surveyItem, question } = options;
    let skipped = 0;
    let answered = 0;
    let skippedByFlow = 0;

    // count skipped answered
    if (surveyItem || question) {
      const [{ $match: { createdAt } }] = aggregate;

      const $match = {
        $or: [
          { skipped: { $gt: 0 } },
          { answered: { $gt: 0 } },
          { skippedByFlow: { $gt: 0 } }
        ]
      };

      if (createdAt) $match.time = createdAt;
      if (question) $match.question = question._id;
      if (surveyItem) $match.surveyItem = surveyItem._id;

      const statistic = await QuestionStatistic.model.aggregate([
        {
          $match
        },
        {
          $group: {
            _id: null,
            skipped: { $sum: '$skipped' },
            answered: { $sum: '$answered' },
            skippedByFlow: { $sum: '$skippedByFlow' }
          }
        }
      ]);

      if (statistic.length) ([{ skipped, answered, skippedByFlow }] = statistic);
    }

    // if data present (filtered from segments)
    if (data.length) {
      const string = data.reduce((acc, d) => `${d.data} ${acc}`, '');

      return { data: wordFrequency(string), skipped, answered, skippedByFlow };
    }

    // aggregate data (standard text report)
    const result = await SurveyResult.model.aggregate(aggregate);

    return {
      data: result.map(d => ({ text: d._id, value: d.text })),
      skipped,
      answered,
      skippedByFlow
    };
  } catch (e) {
    console.log(chalk.red(`processTextQuestion: ${e}`));
    return Promise.reject(e);
  }
}
