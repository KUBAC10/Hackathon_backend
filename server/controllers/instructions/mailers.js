// configurations
import config from '../../../config/env';

import accessControl from '../../helpers/accessControl';
import powerUser from '../access/powerUser';
import teamUser from '../access/teamUser';
import parseSingleDateToRange from '../../helpers/parseSingleDateToRange';
import findUserByName from '../../helpers/findUserByName';

export default {
  list: {
    auth: accessControl(powerUser(), teamUser()),
    query: async (req) => {
      const { name, type, withoutBase, createdAt, updatedAt, updatedBy, createdBy } = req.query;
      const { timeZone = config.timezone } = req.cookies;

      const query = {
        distribute: { $ne: true },
        pulse: { $ne: true }
      };

      if (name) query.name = { $regex: name, $options: 'i' };
      if (withoutBase) query.type = { $ne: 'base' };
      if (type) query.type = type;
      if (createdAt) query.createdAt = parseSingleDateToRange(createdAt, timeZone);
      if (updatedAt) query.updatedAt = parseSingleDateToRange(updatedAt, timeZone);
      if (updatedBy) query.updatedBy = await findUserByName(updatedBy);
      if (createdBy) query.createdBy = await findUserByName(createdBy);

      return query;
    },
    select: ['_id', 'name', 'subject', 'template', 'type', 'createdAt', 'updatedAt'],
    defaultSort: { createdAt: -1 },
    populate: [
      {
        path: 'updatedBy',
        select: 'name',
        match: { isAdmin: { $ne: true } }
      },
      {
        path: 'createdBy',
        select: 'name',
        match: { isAdmin: { $ne: true } }
      },
      {
        path: 'globalMailer',
        select: 'description templateVariables'
      }
    ]
  },
  show: {
    auth: accessControl(powerUser(), teamUser()),
    select: ['_id', 'name', 'subject', 'template', 'type', 'createdAt', 'updatedAt', 'company', 'team'],
    populate: [
      {
        path: 'updatedBy',
        select: 'name',
        match: { isAdmin: { $ne: true } }
      },
      {
        path: 'createdBy',
        select: 'name',
        match: { isAdmin: { $ne: true } }
      },
      {
        path: 'globalMailer',
        select: 'description templateVariables'
      }
    ]
  },
  update: {
    auth: accessControl(powerUser()),
    select: ['_id', 'name', 'subject', 'type', 'template', 'createdAt', 'updatedAt', 'company', 'team'],
    populate: [
      {
        path: 'updatedBy',
        select: 'name',
        match: { isAdmin: { $ne: true } }
      },
      {
        path: 'createdBy',
        select: 'name',
        match: { isAdmin: { $ne: true } }
      },
      {
        path: 'globalMailer',
        select: 'description templateVariables'
      }
    ]
  }
};
