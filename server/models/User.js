import keystone from 'keystone';
import uniqueValidator from 'mongoose-unique-validator';
import uuid from 'uuid';
import _ from 'lodash';

// validator
import { emailValidator, phoneNumberValidator } from '../helpers/validators';

// helpers
import {
  initSession,
  initSessionWithTransaction,
  abortTransaction,
  commitTransaction
} from '../helpers/transactions';

// services
import CloudinaryUploader from '../services/CloudinaryUploader';
import { redisClient } from '../services/RedisClientBuilder';

// mailers
import confirmEmailMailer from '../mailers/confirmEmail.mailer';
import { Company, Team, TeamUser } from './index';

export const roles = [
  'Entrepreneur / Business owner',
  'C-level / VP',
  'Team leader',
  'Team member'
];

const config = require('../../config/env');

const Types = keystone.Field.Types;

/**
 * User Model
 * ==========
 */
const User = new keystone.List('User', {
  track: true,
  defaultSort: '-createdAt'
});

User.add({
  name: { type: Types.Name, required: true, index: true },
  email: {
    type: Types.Email,
    lowercase: true,
    trim: true,
    index: {
      unique: true,
      partialFilterExpression: { email: { $type: 'string' } }
    },
    note: 'Email where would be send company admin emails'
  },
  phoneNumber: {
    type: String,
    initial: true,
    uniqueCaseInsensitive: true,
    trim: true,
    index: {
      unique: true,
      partialFilterExpression: { phoneNumber: { $type: 'string' } }
    },
    note: '1-15 digit numbers'
  },
  password: {
    type: Types.Password,
    workFactor: config.env === 'production' ? 10 : 4
  },
  linkedinId: {
    type: String
  },
  googleId: {
    type: String
  },
  address: {
    street: { type: String },
    zipCode: { type: String },
    city: { type: String },
    country: {
      type: Types.Relationship,
      ref: 'Country'
    },
  },
  defaultLanguage: {
    type: Types.Select,
    options: 'en, de',
    required: true,
    default: 'en'
  },
  removingDate: {
    type: Types.Datetime,
    default: null
  },
  company: {
    type: Types.Relationship,
    ref: 'Company',
    initial: true
  },
  acceptedAt: {
    type: Types.Date,
    default: null,
    note: 'Date when email was accepted'
  },
  currentTeam: {
    type: Types.Relationship,
    ref: 'Team',
    initial: true
  },
  tableColumnSettings: {
    type: Types.Relationship,
    ref: 'TableColumnSettings',
  },
  role: {
    type: Types.Select,
    options: roles
  },
  defaultTags: {
    type: Types.Relationship,
    ref: 'Tag',
    many: true
  },
  avatar: {
    type: Types.CloudinaryImage,
    initial: true,
    autoCleanup: true,
    folder(item) {
      /* istanbul ignore next */
      return `${item.company}/user-avatar/${item._id}`;
    },
    note: 'For user avatar'
  },
  fakeDataAccess: {
    type: Boolean
  },
}, 'Permissions', {
  isLite: { type: Boolean, label: 'Screver Lite user', index: true },
  isAdmin: { type: Boolean, label: 'Can access Keystone (Global Admin)', index: true },
  isPowerUser: { type: Boolean, label: 'Admin of the company, could be multiple', index: true },
  isTemplateMaker: {
    type: Boolean,
    label: 'Can create templates with extended scopes',
    index: true
  }
});

User.schema.add({ emailChangeCount: { type: Object, default: {} } });

User.schema.set('toJSON', {
  virtuals: true,
  transform(doc, ret) {
    /* istanbul ignore next */
    delete ret._;
    /* istanbul ignore next */
    return ret;
  }
});

User.schema.virtual('userTeams', {
  ref: 'TeamUser',
  localField: '_id',
  foreignField: 'user'
});

// Provide access to Keystone
User.schema.virtual('canAccessKeystone')
  .get(function () {
    return this.isAdmin;
  });

User.schema.pre('validate', function (next) {
  if (this.isModified('phoneNumber') && this.phoneNumber === '') {
    this.phoneNumber = null;
  }
  next();
});

User.schema.pre('validate', function (next) {
  if (this.isModified('email') && this.email === '') {
    this.email = undefined;
  }
  next();
});

User.schema.pre('validate', function (next) {
  if (this.isModified('phoneNumber') && this.phoneNumber) {
    this.phoneNumber = this.phoneNumber.trim()
      .replace(/\D/g, '');
  }
  next();
});

User.schema.post('init', function () {
  const oldThis = this.toObject();

  this._oldAvatar = oldThis.avatar;
});

// start session
User.schema.pre('save', async function (next) {
  try {
    this._innerSession = !this.$session();
    this.currentSession = this.$session() || await initSessionWithTransaction();
    next();
  } catch (e) {
    /* istanbul ignore next */
    if (this._innerSession) await abortTransaction(this.currentSession);
    /* istanbul ignore next */
    return next(e);
  }
});

// Validate email and phone number
User.schema.pre('save', async function (next) {
  try {
    await emailValidator(this, next);
    await phoneNumberValidator(this, next);
    next();
  } catch (e) {
    /* istanbul ignore next */
    return next(e);
  }
});

// create team user if team was given in creation process
User.schema.pre('save', async function (next) {
  if (this._userTeams) {
    try {
      const TeamUser = keystone.lists.TeamUser;
      const prevUserTeams = await TeamUser.model
        .find({ user: this._id }, 'team')
        .lean();

      // handle team Ids from user teams
      const prevUserTeamIds = prevUserTeams.map(i => i.team.toString());

      // handle teams to remove user teams
      const teamsToRemove = _.difference(prevUserTeamIds, this._userTeams);

      // handle teams to create new user teams
      const teamsToCreate = _.difference(this._userTeams, prevUserTeamIds);

      // create new user teams
      for (const team of teamsToCreate) {
        const userTeam = new TeamUser.model({
          company: this.company,
          user: this._id,
          team
        });

        await userTeam.save({ session: this.currentSession });
      }

      // remove old user teams
      for (const team of teamsToRemove) {
        const userTeam = await TeamUser.model.findOne({
          company: this.company,
          user: this._id,
          team
        });

        if (userTeam) await userTeam.remove({ session: this.currentSession });
      }
    } catch (e) {
      /* istanbul ignore next */
      if (this._innerSession) await abortTransaction(this.currentSession);
      /* istanbul ignore next */
      return next(e);
    }
  }
  next();
});

// upload new image to cloudinary
User.schema.pre('save', async function (next) {
  try {
    if (_.isString(this._avatar)) {
      this.avatar = await CloudinaryUploader
        .uploadImage({
          company: this.company,
          encodedFile: this._avatar,
          entity: this,
          actionName: 'avatar'
        });

      const oldPublic_id = _.get(this, '_oldAvatar.public_id');

      if (oldPublic_id) await CloudinaryUploader.cleanUp({ public_id: oldPublic_id });

      _.unset(this, '_oldAvatar');
      _.unset(this, '_avatar');
    }

    // remove avatar
    if (this._avatar === null) {
      const public_id = _.get(this, 'avatar.public_id');

      if (public_id) await CloudinaryUploader.cleanUp({ public_id });

      this.avatar = undefined;
    }

    next();
  } catch (e) {
    return next(e);
  }
});

// confirm email
User.schema.pre('save', async function (next) {
  try {
    if (this.isLite && this.isModified('email')) {
      const token = uuid();
      const { _id, email } = this;

      console.log('tokennnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnn')
console.log(token)
console.log('tokennnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnn')
      await redisClient.setAsync(`confirmEmailToken:${token}`, _id.toString(), 'EX', config.ttlConfirmationToken);

      
      if (config.env === 'production') confirmEmailMailer({ token, email });

      // unset date of confirmation
      this.acceptedAt = undefined;
    }

    next();
  } catch (e) {
    return next(e);
  }
});

// commit session
User.schema.pre('save', async function (next) {
  try {
    if (this._innerSession) {
      await commitTransaction(this.currentSession);
      this.currentSession = undefined;
    }
    next();
  } catch (e) {
    /* istanbul ignore next */
    if (this._innerSession) await abortTransaction(this.currentSession);
    /* istanbul ignore next */
    return next(e);
  }
});

// TODO add soft-delete?
// start remove session
User.schema.pre('remove', async function (next) {
  try {
    this._innerSession = !this.$session();
    this.currentSession = this.$session() || await initSessionWithTransaction();
    next();
  } catch (e) {
    /* istanbul ignore next */
    if (this._innerSession) await abortTransaction(this.currentSession);
    /* istanbul ignore next */
    return next(e);
  }
});

// Clear related entities
User.schema.pre('remove', async function (next) {
  try {
    const TeamUser = keystone.lists.TeamUser;
    await TeamUser.model.deleteMany({ user: this._id }, { session: this.currentSession });

    next();
  } catch (e) {
    /* istanbul ignore next */
    if (this._innerSession) await abortTransaction(this.currentSession);
    /* istanbul ignore next */
    return next(e);
  }
});

// clear cloudinary image
User.schema.pre('remove', async function (next) {
  try {
    const public_id = _.get(this, 'avatar.public_id');

    if (public_id) await CloudinaryUploader.cleanUp({ public_id });

    next();
  } catch (e) {
    return next(e);
  }
});

// commit remove session
User.schema.pre('remove', async function (next) {
  try {
    if (this._innerSession) await commitTransaction(this.currentSession);
    next();
  } catch (e) {
    /* istanbul ignore next */
    if (this._innerSession) await abortTransaction(this.currentSession);
    /* istanbul ignore next */
    return next(e);
  }
});

// create LITE user by provider id, or create
User.schema.statics.createLite =
  async function ({ provider, id, password, email, firstName, lastName }) {
    try {
      // raise error if no email+password or provider+id
      if (!(email && password) && !(provider && id)) {
        return Promise.reject('incorrect provider data');
      }

      // create user / company / team
      const session = await initSession();
      const companyName = uuid();

      const company = new Company.model({
        email,
        name: companyName,
        urlName: companyName,
        isLite: true
      });

      const team = new Team.model({
        company,
        name: uuid()
      });

      const user = new User.model({
        email,
        company,
        password,
        [`${provider}Id`]: id,
        isLite: true,
        currentTeam: team._id,
        name: {
          first: firstName,
          last: lastName
        }
      });

      const teamUser = new TeamUser.model({
        user,
        team,
        company
      });

      // save user
      await session.withTransaction(async () => {
        await company.save({ session });
        await team.save({ session });
        await user.save({ session });
        await teamUser.save({ session });
      });

      return user;
    } catch (e) {
      return Promise.reject(e);
    }
  };

User.schema.plugin(uniqueValidator, { message: 'This {PATH} has already been taken' });

/**
 * Registration
 */
User.defaultColumns = 'name, email, phoneNumber, isAdmin, isPowerUser createdAt';
User.register();

export default User;
