// configurations
import config from '../../../config/env';

// access control
import accessControl from '../../helpers/accessControl';
import powerUser from '../access/powerUser';
import teamUser from '../access/teamUser';

// helpers
import parseSingleDateToRange from '../../helpers/parseSingleDateToRange';
import findUserByName from '../../helpers/findUserByName';

export default {
  list: {
    query: async (req) => {
      const { name, updatedBy, createdBy, createdAt, updatedAt } = req.query;
      const { timeZone = config.timezone } = req.cookies;
      const query = {};
      if (name) query.name = { $regex: name, $options: 'i' };
      if (createdAt) query.createdAt = parseSingleDateToRange(createdAt, timeZone);
      if (updatedAt) query.updatedAt = parseSingleDateToRange(updatedAt, timeZone);
      if (updatedBy) query.updatedBy = await findUserByName(updatedBy);
      if (createdBy) query.createdBy = await findUserByName(createdBy);
      return query;
    },
    auth: accessControl(powerUser(), teamUser()),
    select: 'createdAt updatedAt name img',
    populate: [
      {
        path: 'createdBy',
        select: 'name',
        match: { isAdmin: { $ne: true } }
      },
      {
        path: 'updatedBy',
        select: 'name',
        match: { isAdmin: { $ne: true } }
      }
    ],
    defaultSort: { createdAt: -1 }
  },
  show: {
    auth: accessControl(powerUser(), teamUser()),
    select: 'createdAt updatedAt name img',
    populate: [
      {
        path: 'createdBy',
        select: 'name',
        match: { isAdmin: { $ne: true } }
      },
      {
        path: 'updatedBy',
        select: 'name',
        match: { isAdmin: { $ne: true } }
      }
    ]
  },
  update: {
    auth: accessControl(powerUser(), teamUser('createdBy')),
    select: 'createdAt name img',
    populate: [
      {
        path: 'createdBy',
        select: 'name',
        match: { isAdmin: { $ne: true } }
      },
      {
        path: 'updatedBy',
        select: 'name',
        match: { isAdmin: { $ne: true } }
      }
    ]
  },
  destroy: {
    auth: accessControl(powerUser(), teamUser('createdBy')),
  }
};
