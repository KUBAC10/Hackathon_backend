import httpStatus from 'http-status';
import _ from 'lodash';

// models
import {
  Contact,
  Tag,
  TagEntity,
  Survey,
  SurveyCampaign
} from '../../../models';

// helpers
import { initSession } from '../../../helpers/transactions';
import { hasAccess } from '../../helpers';

/** POST /api/v1/tags/:id/add-contacts */
async function addContacts(req, res, next) {
  try {
    const session = await initSession();

    const { id } = req.params;
    const { contacts } = req.body;
    const { companyId: company } = req.user;

    // load tag
    const tag = await Tag.model.findOne({ _id: id, company });
    if (!tag) return res.sendStatus(400);

    const tagEntities = [];
    await session.withTransaction(async () => {
      for (const contact of contacts) {
        // load contact - check if valid
        const contactDoc = await Contact.model
          .findOne({ _id: contact, company })
          .lean();
        if (!contactDoc) return;

        // check if tagEntity is already present
        let tagEntity = await TagEntity.model
          .findOne({ tag, contact, company })
          .lean();
        if (tagEntity) return;

        // create new tagEntity
        tagEntity = new TagEntity.model({
          tag,
          contact,
          company
        });

        tagEntity._req_user = { _id: req.user._id };

        await tagEntity.save({ session });

        tagEntities.push(tagEntity);
      }
    });

    return res.send(tagEntities);
  } catch (e) {
    return next(e);
  }
}

/** GET /api/v1/tags/by-survey - return list of tags  */
async function tagsBySurvey(req, res, next) {
  try {
    const { survey: surveyId } = req.query;

    const survey = await Survey.model
      .findOne({ _id: surveyId })
      .lean();

    if (!survey) return res.sendStatus(httpStatus.NOT_FOUND);

    if (!hasAccess(survey, req.scopes)) return res.sendStatus(httpStatus.FORBIDDEN);

    const surveyCampaigns = await SurveyCampaign.model
      .find({ survey: survey._id })
      .select('tags')
      .populate('tags')
      .lean();

    const tags = surveyCampaigns
      .reduce((acc, { tags = [] }) => [...acc, ...tags], [])
      .map(tag => ({ ...tag, _id: tag._id.toString() }));

    const resources = _.uniqBy(tags, '_id');

    return res.send({ resources });
  } catch (e) {
    return next(e);
  }
}

export default {
  addContacts,
  tagsBySurvey
};
