import _ from 'lodash';
import keystone from 'keystone';
import mongoose from 'mongoose';
import uniqueValidator from 'mongoose-unique-validator';

// helpers
import applySoftDelete from '../helpers/softDelete';
import {
  initSessionWithTransaction,
  abortTransaction,
  commitTransaction
} from '../helpers/transactions';

// services
import CloudinaryUploader from '../services/CloudinaryUploader';

const Types = keystone.Field.Types;

/**
 * Team Model
 * ==========
 */
const Team = new keystone.List('Team', {
  track: true
});

Team.add({
  inTrash: {
    type: Boolean
  },
  name: {
    type: String,
    initial: true,
    required: true
  },
  description: {
    type: String
  },
  company: {
    type: Types.Relationship,
    ref: 'Company',
    initial: true,
    required: true
  },
  logo: {
    type: Types.CloudinaryImage,
    autoCleanup: true,
    initial: true,
    folder(item) {
      /* istanbul ignore next */
      return `${item.company}/team-logo/${item._id}`;
    }
  }
});

Team.schema.plugin(uniqueValidator, { message: 'This {PATH} has already been taken' });
Team.schema.index({ name: 1, company: 1 }, { unique: true });

Team.schema.virtual('userTeams', {
  ref: 'TeamUser',
  localField: '_id',
  foreignField: 'team'
});

Team.schema.virtual('userTeamsCount', {
  ref: 'TeamUser',
  localField: '_id',
  foreignField: 'team',
  count: true
});

Team.schema.post('init', function () {
  const oldThis = this.toObject();

  this._oldLogo = oldThis.logo;
});

// validate name uniq
Team.schema.pre('save', async function (next) {
  try {
    if (this.isNew || this.isModified('name')) {
      const counter = await Team.model
        .find({ company: this.company, name: this.name })
        .countDocuments();

      if (counter > 0) {
        const { ValidationError, ValidatorError } = mongoose.Error;
        const error = new ValidationError(this);

        error.errors.name = new ValidatorError({ message: 'This name already been taken' });

        return next(error);
      }
    }

    next();
  } catch (e) {
    return next(e);
  }
});

// upload new image to cloudinary
Team.schema.pre('save', async function (next) {
  try {
    if (_.isString(this._logo)) {
      this.logo = await CloudinaryUploader
        .uploadImage({
          company: this.company,
          encodedFile: this._logo,
          entity: this,
          actionName: 'teamLogo'
        });

      const oldPublic_id = _.get(this, '_oldLogo.public_id');

      if (oldPublic_id) await CloudinaryUploader.cleanUp({ public_id: oldPublic_id });

      _.unset(this, '_oldLogo');
      _.unset(this, '_logo');
    }

    // remove logo
    if (this._logo === null) {
      const public_id = _.get(this, 'logo.public_id');

      if (public_id) await CloudinaryUploader.cleanUp({ public_id });

      this.logo = undefined;
    }

    next();
  } catch (e) {
    return next(e);
  }
});

// TODO: Add indexes
// start remove session
Team.schema.pre('remove', async function (next) {
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
Team.schema.pre('remove', async function (next) {
  try {
    // UserTeams
    const TeamUser = keystone.lists.TeamUser;
    await TeamUser.model.deleteMany({ team: this._id });

    next();
  } catch (e) {
    /* istanbul ignore next */
    if (this._innerSession) await abortTransaction(this.currentSession);
    /* istanbul ignore next */
    return next(e);
  }
});

// clear cloudinary image
Team.schema.pre('remove', async function (next) {
  try {
    const public_id = _.get(this, 'logo.public_id');

    if (public_id) await CloudinaryUploader.cleanUp({ public_id });

    next();
  } catch (e) {
    return next(e);
  }
});

// commit remove session
Team.schema.pre('remove', async function (next) {
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

// soft delete
Team.schema.methods.softDelete = applySoftDelete('team');

/**
 * Registration
 */
Team.defaultColumns = 'name company createdAt';
Team.register();

export default Team;
