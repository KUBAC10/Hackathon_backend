import sw from 'stopword';
import _ from 'lodash';

// models
import { SurveyItem } from '../../../models';

// config
import { localizationList } from '../../../../config/localization';

// build aggregate to give text word cloud data
export default async function textAggregate(options = {}) {
  try {
    const { question, surveyItem, range, reportRange } = options;

    // get stop words
    const stopwords = _.flatten(localizationList.map(lang => sw[lang]));

    // inti aggregate properties
    const $match = { hide: { $ne: true }, preview: { $ne: true } };
    const input = {};

    // set range if exists
    if (range) {
      $match.createdAt = {
        $gte: range.start.toDate(),
        $lte: range.end.toDate()
      };
    }

    if (reportRange && (reportRange.from || reportRange.to)) {
      $match.createdAt = {};
      if (reportRange.from) $match.createdAt.$gte = reportRange.from.toDate();
      if (reportRange.to) $match.createdAt.$lte = reportRange.to.toDate();
    }

    if (surveyItem) {
      // set match
      $match[`answer.${surveyItem._id}`] = { $exists: true };

      // set condition for map input
      input.$split = [{ $toString: `$answer.${surveyItem._id}.value` }, ' '];
    } else {
      // init or condition
      $match.$or = [];

      // init concatArrays in input
      input.$concatArrays = [];

      // load surveyItems related to given question
      const surveyItems = await SurveyItem.model
        .find({ question: question._id })
        .select('_id')
        .lean();

      if (!surveyItems.length) return false;

      // handle each survey item
      surveyItems.forEach((item) => {
        // set survey item to match
        $match.$or.push({ [`answer.${item._id}.value`]: { $exists: true } });

        // handle map input
        input.$concatArrays.push({ $split: [{ $ifNull: [`$answer.${item._id}.value`, ' '] }, ' '] });
      });
    }

    return [
      {
        $match
      },
      {
        $addFields: {
          words: {
            $map: {
              input,
              as: 'str',
              in: {
                $trim: {
                  input: { $toLower: ['$$str'] },
                  chars: ' ,|(){}-<>.;'
                }
              }
            }
          }
        }
      },
      {
        $unwind: '$words'
      },
      {
        $match: {
          words: {
            $nin: stopwords
          }
        }
      },
      {
        $group: {
          _id: '$words',
          text: { $sum: 1 }
        }
      },
      {
        $sort: { text: -1 }
      },
      {
        $limit: 50
      }
    ];
  } catch (e) {
    return Promise.reject(e);
  }
}
