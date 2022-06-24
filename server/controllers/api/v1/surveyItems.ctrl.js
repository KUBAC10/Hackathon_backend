import httpStatus from 'http-status';

// models
import { SurveyItem } from '../../../models';
import { checkPermission, hasAccess } from '../../helpers';

/** DELETE /api/v1/survey-items/:id */
async function destroy(req, res, next) {
  try {
    const { id } = req.params;
    const query = { _id: id };

    // find survey
    const surveyItem = await SurveyItem.model
      .findOne(query);

    // return error if survey not found
    if (!surveyItem) return res.sendStatus(httpStatus.NOT_FOUND);

    if (!hasAccess(surveyItem, req.scopes)) return res.sendStatus(httpStatus.FORBIDDEN);

    // check permission to delete
    if (!checkPermission({ user: req.user, doc: surveyItem })) {
      return res.sendStatus(httpStatus.FORBIDDEN);
    }

    // save survey and trash entity
    await surveyItem.softDelete({
      _req_user: { _id: req.user._id }
    });

    return res.sendStatus(httpStatus.NO_CONTENT);
  } catch (e) {
    /* istanbul ignore next */
    return next(e);
  }
}

export default { destroy };
