import httpStatus from 'http-status';
import _ from 'lodash';

// models
import {
  Survey,
  SurveyReport
} from '../../../models';

// helpers
import { hasAccess } from '../../helpers';

// services
import segments from '../../../services/segments';

async function filter(req, res, next) {
  try {
    const { id } = req.params;
    const { filters = {}, answers, surveyItems: surveyItemsSelect = [], surveyReportId } = req.body;
    const query = { _id: id };

    // find survey by scopes
    const survey = await Survey.model
      .findOne(query)
      .select('_id company team surveyItems')
      .populate({
        path: 'surveyItems',
        match: { type: { $in: ['question', 'trendQuestion'] } },
        select: 'question',
        populate: {
          path: 'question',
          select: 'type'
        }
      })
      .lean();

    if (!survey) return res.sendStatus(httpStatus.NOT_FOUND);

    if (!hasAccess(survey, req.scopes)) return res.sendStatus(httpStatus.FORBIDDEN);

    // save segments query to report
    if (surveyReportId) {
      const surveyReport = await SurveyReport.model.findOne({ _id: surveyReportId });

      if (surveyReport) {
        filters.createdAt = surveyReport.getRange();

        surveyReport.segments = req.body;

        surveyReport.markModified('segments');

        await surveyReport.save();
      }
    }

    answers.forEach((answer) => {
      const item = survey.surveyItems.find(i => i._id.toString() === answer.surveyItem);

      if (['linearScale', 'netPromoterScore', 'slider'].includes(item.question.type)) {
        if (_.isString(answer.value)) {
          answer.value = parseInt(answer.value, 10);
        }

        if (_.isArray(answer.value)) {
          answer.value = answer.value.map(item => parseInt(item, 10));
        }
      }
    });

    const surveyItems = surveyItemsSelect.length
      ? surveyItemsSelect
      : survey.surveyItems.map(i => i._id);

    // get versus data
    const result = await segments({ filters, answers, surveyItems, survey: survey._id });

    return res.send(result);
  } catch (e) {
    /* istanbul ignore next */
    return next(e);
  }
}

export default { filter };
