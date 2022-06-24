import accessControl from '../../helpers/accessControl';
import powerUser from '../access/powerUser';

import multiLangSearchBuilder from '../../helpers/multiLangSearchBuilder';

export default {
  list: {
    auth: accessControl(powerUser()),
    query: (req) => {
      const { name, type, lang, user, mailer } = req.query;

      const query = {};
      if (type) query.type = type;
      if (lang) query.lang = lang;
      if (user) query.user = user;
      if (mailer) query.mailer = mailer;
      if (name) {
        query.$or = multiLangSearchBuilder('name', name);
      }

      return query;
    },
    select: ['name', '_id', 'type', 'user', 'subject', 'to', 'lang', 'mailer', 'data', 'createdAt', 'updatedAt', 'company', 'team'],
    defaultSort: { createdAt: -1 },
    populate: [
      {
        path: 'mailer',
        select: 'name template'
      },
      {
        path: 'user',
        select: 'name'
      },
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
    ]
  },
  show: {
    auth: accessControl(powerUser()),
    select: ['name', '_id', 'type', 'user', 'subject', 'to', 'lang', 'mailer', 'data', 'createdAt', 'updatedAt', 'company', 'team'],
    defaultSort: { createdAt: -1 },
    populate: [
      {
        path: 'mailer',
        select: 'name template'
      },
      {
        path: 'user',
        select: 'name'
      },
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
    ]
  },
  destroy: {
    auth: accessControl(powerUser())
  }
};
