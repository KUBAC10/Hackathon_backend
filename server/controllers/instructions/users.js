// configurations
import config from '../../../config/env';

// access control
import accessControl from '../../helpers/accessControl';
import powerUser from '../access/powerUser';

// helpers
import parseSingleDateToRange from '../../helpers/parseSingleDateToRange';
import findUserByName from '../../helpers/findUserByName';

// models
import {
  TeamUser
} from '../../models';

function textSearch(by) {
  return { $regex: by, $options: 'i' };
}

export default {
  list: {
    auth: accessControl(powerUser()),
    query: async (req) => {
      const {
        name, email, phoneNumber, updatedBy, createdBy, createdAt, updatedAt,
        street, zipCode, city, country, withoutTeamUsers
      } = req.query;
      const { timeZone = config.timezone } = req.cookies;
      const query = {};
      query._id = { $ne: req.user._id };
      // skip existing Users in given team
      if (withoutTeamUsers) {
        const existingUsers = await TeamUser.model.find({ team: withoutTeamUsers }).lean();
        query._id.$nin = existingUsers.map(i => i.user.toString());
      }
      if (email) query.email = textSearch(email);
      if (country) query['address.country'] = country;
      if (city) query['address.city'] = textSearch(city);
      if (street) query['address.street'] = textSearch(street);
      if (zipCode) query['address.zipCode'] = textSearch(zipCode);
      if (phoneNumber) query.phoneNumber = { $regex: phoneNumber.trim().replace(/\D/g, '') };
      if (createdAt) query.createdAt = parseSingleDateToRange(createdAt, timeZone);
      if (updatedAt) query.updatedAt = parseSingleDateToRange(updatedAt, timeZone);
      if (updatedBy) query.updatedBy = await findUserByName(updatedBy);
      if (createdBy) query.createdBy = await findUserByName(createdBy);

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
    select: 'createdAt updatedAt name email acceptedAt phoneNumber address defaultLanguage isPowerUser avatar',
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
        path: 'address.country',
        select: 'localization',
      },
      {
        path: 'location',
        select: 'name',
      },
      {
        path: 'userTeams',
        select: 'team',
        populate: {
          path: 'team',
          select: 'name'
        }
      }
    ],
  },
  show: {
    auth: accessControl(powerUser()),
    select: 'createdAt updatedAt name email acceptedAt phoneNumber address defaultLanguage isPowerUser company avatar',
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
        path: 'address.country',
        select: 'localization',
      },
      {
        path: 'location',
        select: 'name',
      },
      {
        path: 'userTeams',
        select: 'team',
        populate: {
          path: 'team',
          select: 'name logo'
        }
      }
    ],
  },
};
