import moment from 'moment';
import _ from 'lodash';

// configurations
import config from '../../../config/env';

// helpers
import findUserByName from '../../helpers/findUserByName';
import findContactByName from '../../helpers/findContactByName';
import parseSingleDateToRange from '../../helpers/parseSingleDateToRange';
// access control
import accessControl from '../../helpers/accessControl';
import powerUser from '../access/powerUser';
import teamUser from '../access/teamUser';

export default {
  list: {
    auth: accessControl(powerUser(), teamUser('team')),
    query: async (req) => {
      const {
        survey, contact, completed, startedAt, step,
        createdAt, createdBy, from, to, location, search, tags, targets, campaigns
      } = req.query;
      const { timeZone = config.timezone } = req.cookies;
      const query = {
        empty: false,
        hide: { $ne: true },
        preview: { $ne: true }
      };

      // base filters
      if (tags) {
        if (_.isArray(tags) && tags.length) query.tags = { $in: tags };
        if (_.isString(tags)) query.tags = tags;
      }
      if (step) query.step = { ...step };
      if (survey) query.survey = survey;
      if (contact) query.contact = contact;
      if (typeof completed !== 'undefined') query.completed = completed;
      if (from) {
        query.createdAt = {
          $gte: moment(from)
            .startOf('day')
            .tz(timeZone)
        };
      }
      if (to) {
        query.createdAt = {
          ...query.createdAt,
          $lte: moment(to)
            .endOf('day')
            .tz(timeZone)
        };
      }
      if (createdAt) query.createdAt = parseSingleDateToRange(createdAt, timeZone);
      if (startedAt) query.startedAt = parseSingleDateToRange(startedAt, timeZone);
      if (createdBy) query.createdBy = await findUserByName(createdBy);
      if (location) query['location.formattedAddress'] = { $regex: location, $options: 'i' };
      if (search) { // search by location or contact name
        query.$or = [
          { 'location.formattedAddress': { $regex: search, $options: 'i' } },
          { contact: await findContactByName(search, req.scopes) }
        ];
      }
      if (targets) {
        if (_.isArray(targets)) query.target = { $in: targets };
        if (_.isString(targets)) query.target = targets;
      }

      if (campaigns) {
        if (_.isArray(campaigns)) query.surveyCampaign = { $in: campaigns };
        if (_.isString(campaigns)) query.surveyCampaign = campaigns;
      }

      return query;
    },
    select: '-updatedAt -__v',
    populate: [
      {
        path: 'contact',
        select: 'name email',
      },
      {
        path: 'createdBy',
        select: 'name',
        match: { isAdmin: { $ne: true } }
      },
    ],
    defaultSort: { createdAt: -1 }
  },
  show: {
    auth: accessControl(powerUser(), teamUser('team')),
    select: '-updatedAt -__v',
    populate: [
      {
        path: 'createdBy',
        select: 'name',
        match: { isAdmin: { $ne: true } }
      },
    ],
  },
};
