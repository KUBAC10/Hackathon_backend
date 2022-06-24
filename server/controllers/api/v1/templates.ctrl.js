import httpStatus from 'http-status';

// models
import { Survey } from '../../../models';

// helpers
import { initSession } from '../../../helpers/transactions';
import {
  handleScopes,
  loadSurveyDoc
} from '../../helpers';

/** POST /api/v1/templates/clone/:id - clone existing survey and create template */
/** Create new survey with all related items in current team/company by given template */
async function clone(req, res, next) {
  const session = await initSession();
  try {
    const { id } = req.params;
    const { type, defaultLanguage } = req.body;
    const { user } = req;
    const query = { _id: id, inTrash: { $ne: true } };

    let cloneId;

    await handleScopes({ query, reqScopes: req.scopes, checkScope: true });

    const survey = await Survey.model.findOne(query);

    if (!survey) return res.sendStatus(httpStatus.NOT_FOUND);

    // change default language from clone
    const currentLanguages = Object
      .keys(survey.translation)
      .filter(key => survey.translation[key] === true);

    if (defaultLanguage && currentLanguages.includes(defaultLanguage)) {
      survey.defaultLanguage = defaultLanguage;
    }

    await session.withTransaction(async () => {
      cloneId = await survey.getClone({ session, user, type });
    });

    if (!cloneId) return res.sendStatus(httpStatus.BAD_REQUEST);

    const clone = await loadSurveyDoc({ _id: cloneId });

    return res.status(httpStatus.CREATED).send(clone);
  } catch (e) {
    return next(e);
  }
}

export default { clone };
