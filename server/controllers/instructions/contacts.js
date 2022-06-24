// base
import moment from 'moment';

// configurations
import config from '../../../config/env';

// helpers
import searchByTag from '../helpers/searchByTag';
import parseSingleDateToRange from '../../helpers/parseSingleDateToRange';
import findUserByName from '../../helpers/findUserByName';

// access control
import accessControl from '../../helpers/accessControl';
import powerUser from '../access/powerUser';
import teamUser from '../access/teamUser';

// models
import TagEntity from '../../models/TagEntity';

export default {
  list: {
    auth: accessControl(powerUser('team'), teamUser('team')),
    query: async (req) => {
      const query = {};
      const {
        tagName, name, phoneNumber, updatedBy,
        createdBy, createdAt, updatedAt, tags,
      } = req.query;
      const { timeZone = config.timezone } = req.cookies;
      // search by tag name
      if (tagName) {
        query._id = await searchByTag({
          tagName,
          entity: 'contact',
          scopes: req.scopes
        });
      }
      if (phoneNumber) query.phoneNumber = { $regex: phoneNumber.trim().replace(/\D/g, '') };
      if (updatedAt) query.updatedAt = parseSingleDateToRange(updatedAt, timeZone);
      if (updatedBy) query.updatedBy = await findUserByName(updatedBy);
      if (createdBy) query.createdBy = await findUserByName(createdBy);

      if (tags) {
        const tagEntities = await TagEntity
          .model
          .find({
            tag: { $in: tags },
            company: req.user.companyId,
            contact: { $exists: true, $ne: null }
          })
          .lean();
        query._id = tagEntities.map(i => i.contact);
      }

      if (createdAt) {
        const { from, to } = createdAt;
        query.createdAt = {};
        if (from) {
          query.createdAt.$gte = moment(from)
            .startOf('day')
            .tz(timeZone);
        }
        if (to) {
          query.createdAt.$lte = moment(to)
            .endOf('day')
            .tz(timeZone);
        }
      }

      if (name) {
        const splitedName = name.split(' ');
        query.$or = query.$or || [];
        splitedName.forEach((item) => {
          query.$or.push({ 'name.first': { $regex: item, $options: 'i' } });
          query.$or.push({ 'name.last': { $regex: item, $options: 'i' } });
        });

        // search by email
        query.$or.push({ email: { $regex: name, $options: 'i' } });
      }

      return query;
    },
    select: 'createdAt updatedAt name email phoneNumber user team',
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
        path: 'tagEntities',
        select: '-createdBy -updatedAt -updatedBy -__v',
        populate: [
          {
            path: 'tag', select: 'createdAt name description color'
          }
        ]
      }
    ],
    defaultSort: { createdAt: -1 }
  },
  show: {
    auth: accessControl(powerUser(), teamUser('team')),
    select: 'createdAt updatedAt name email phoneNumber user team company',
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
        path: 'tagEntities',
        select: '-createdBy -updatedAt -updatedBy -__v',
        populate: [
          {
            path: 'tag', select: 'createdAt name description'
          }
        ]
      }
    ],
  },
  create: {
    auth: accessControl(powerUser('team'), teamUser('team')),
    afterSave: async (doc, req, session) => {
      const { company, _id: contact } = doc;
      const { tags = [] } = req.body;

      // create tagEntities for each tag
      for (const tag of tags) {
        const tagEntity = new TagEntity.model({
          tag,
          contact,
          company
        });

        if (req.user) tagEntity._req_user = { _id: req.user._id };

        await tagEntity.save({ session });
      }
    },
    select: 'createdAt name email phoneNumber user team',
    populate: [
      {
        path: 'tagEntities',
        select: '-createdBy -updatedAt -updatedBy -__v',
        populate: [
          {
            path: 'tag', select: 'createdAt name description'
          }
        ]
      }
    ],
  },
  update: {
    auth: accessControl(powerUser(), teamUser('team')),
    afterSave: async (doc, req, session) => {
      const { company, _id: contact } = doc;
      const { tags = [] } = req.body;

      // load existing tagEntities
      const existingTagEntities = await TagEntity.model.find({ contact, company });

      // get tags to remove
      const tagEntitiesToRemove = existingTagEntities
        .filter(tE => !tags.includes(tE.tag.toString()));
      // remove tags
      for (const tagEntity of tagEntitiesToRemove) {
        await tagEntity.remove({ session });
      }

      // get new tags - that are not present in existingTagEntities
      const newTags = tags
        .filter(tag => !existingTagEntities.some(tE => tE.tag.toString() === tag));

      // create tagEntities for each tag
      for (const tag of newTags) {
        const tagEntity = new TagEntity.model({
          tag,
          contact,
          company
        });

        if (req.user) tagEntity._req_user = { _id: req.user._id };

        await tagEntity.save({ session });
      }
    },
    select: 'createdAt name email phoneNumber user team',
    populate: [
      {
        path: 'tagEntities',
        select: '-createdBy -updatedAt -updatedBy -__v',
        populate: [
          {
            path: 'tag', select: 'createdAt name description'
          }
        ]
      }
    ],
  },
  destroy: {
    auth: accessControl(powerUser(), teamUser('team')),
  }
};
