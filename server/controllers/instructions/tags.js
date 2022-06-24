// configurations
import config from '../../../config/env';

// access control
import accessControl from '../../helpers/accessControl';
import powerUser from '../access/powerUser';
import teamUser from '../access/teamUser';
import templateMaker from '../access/templateMaker';
import liteUser from '../access/liteUser';

// helpers
import parseSingleDateToRange from '../../helpers/parseSingleDateToRange';
import findUserByName from '../../helpers/findUserByName';

export default {
  list: {
    query: async (req) => {
      const { name, updatedBy, createdBy, createdAt, updatedAt, isGlobal } = req.query;
      const { timeZone = config.timezone } = req.cookies;
      const query = { isGlobal: { $ne: true } };

      if (name) query.name = { $regex: name, $options: 'i' };
      if (isGlobal || req.user.isTemplateMaker) {
        query.isGlobal = true;

        delete req.scopes.company;
        delete req.scopes.team;
      }
      if (createdAt) query.createdAt = parseSingleDateToRange(createdAt, timeZone);
      if (updatedAt) query.updatedAt = parseSingleDateToRange(updatedAt, timeZone);
      if (updatedBy) query.updatedBy = await findUserByName(updatedBy);
      if (createdBy) query.createdBy = await findUserByName(createdBy);
      return query;
    },
    auth: accessControl(powerUser('team'), teamUser('team'), liteUser(), templateMaker()),
    select: 'createdAt updatedAt name team description isGlobal color',
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
        path: 'entitiesCount'
      }
    ],
    defaultSort: { createdAt: -1 }
  },
  show: {
    auth: accessControl(powerUser(), teamUser('team')),
    select: 'createdAt updatedAt name team company description isGlobal color',
    customAccess: (doc, scopes) => {
      if (doc.isGlobal) return {};

      return scopes;
    },
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
        path: 'entitiesCount'
      }
    ]
  },
  create: {
    auth: accessControl(powerUser('team'), teamUser('team'), templateMaker()),
    select: 'createdAt name team description isGlobal color',
  },
  update: {
    auth: accessControl(powerUser(), teamUser('team')),
    select: 'createdAt name team description isGlobal color',
  },
  destroy: {
    auth: accessControl(powerUser(), teamUser('team'), templateMaker()),
  }
};
