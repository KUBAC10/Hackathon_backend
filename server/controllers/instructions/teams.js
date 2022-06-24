// configurations
import config from '../../../config/env';

// access control
import accessControl from '../../helpers/accessControl';
import powerUser from '../access/powerUser';
import teamUser from '../access/teamUser';

// helpers
import parseSingleDateToRange from '../../helpers/parseSingleDateToRange';
import findUserByName from '../../helpers/findUserByName';

// models
import {
  TeamUser
} from '../../models';

export default {
  list: {
    query: async (req) => {
      const {
        name, createdAt, updatedAt, createdBy, updatedBy,
        withoutUserTeams
      } = req.query;
      const { timeZone = config.timezone } = req.cookies;
      const { user } = req;
      const query = { inTrash: { $ne: true } };

      if (!user.isPowerUser) {
        const existingTeams = await TeamUser.model.find({ user: user._id }).lean();
        const ids = existingTeams.map(i => i.team.toString());
        query._id = { $in: ids };
      }
      if (user.isPowerUser && withoutUserTeams) {
        const existingTeams = await TeamUser.model.find({ user: withoutUserTeams }).lean();
        const ids = existingTeams.map(i => i.team.toString());
        query._id = { $nin: ids };
      }
      if (createdAt) query.createdAt = parseSingleDateToRange(createdAt, timeZone);
      if (updatedAt) query.updatedAt = parseSingleDateToRange(updatedAt, timeZone);
      if (updatedBy) query.updatedBy = await findUserByName(updatedBy);
      if (createdBy) query.createdBy = await findUserByName(createdBy);
      if (name) query.name = { $regex: name, $options: 'i' };
      return query;
    },
    auth: accessControl(powerUser(), teamUser()),
    select: 'createdAt updatedAt name description logo',
    populate: [
      {
        path: 'createdBy',
        select: 'name'
      },
      {
        path: 'updatedBy',
        select: 'name'
      },
      {
        path: 'userTeamsCount'
      }
    ],
    defaultSort: { createdAt: -1 }
  },
  show: {
    auth: accessControl(powerUser(), teamUser()),
    select: 'createdAt updatedAt name description company logo',
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
      },
      {
        path: 'userTeams',
        select: 'user',
        populate: {
          path: 'user',
          select: 'name avatar email isAdmin userTeams',
          populate: {
            path: 'userTeams',
            select: 'team',
            populate: {
              path: 'team',
              select: 'name logo'
            }
          }
        }
      }
    ]
  },
  create: {
    auth: accessControl(powerUser()),
    select: 'createdAt updatedAt name description logo',
  },
  update: {
    auth: accessControl(powerUser()),
    select: 'createdAt updatedAt name description logo',
    populate: [
      {
        path: 'createdBy',
        select: 'name'
      },
      {
        path: 'updatedBy',
        select: 'name'
      },
      {
        path: 'userTeams',
        select: 'user',
        populate: {
          path: 'user',
          select: 'name'
        }
      }
    ]
  }
};
