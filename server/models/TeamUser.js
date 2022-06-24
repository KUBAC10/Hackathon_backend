import keystone from 'keystone';
import mongoose from 'mongoose';
import uniqueValidator from 'mongoose-unique-validator';

// helpers
import {
  initSessionWithTransaction,
  abortTransaction,
  commitTransaction
} from '../helpers/transactions';

// services
import {
  APIMessagesExtractor
} from '../services';

const Types = keystone.Field.Types;
const ValidationError = mongoose.Error.ValidationError;
const ValidatorError = mongoose.Error.ValidatorError;

/**
 * TeamUser Model
 * ============
 */
const TeamUser = new keystone.List('TeamUser', {
  track: true
});

TeamUser.add({
  team: {
    type: Types.Relationship,
    ref: 'Team',
    initial: true,
    required: true
  },
  user: {
    type: Types.Relationship,
    ref: 'User',
    initial: true,
    required: true
  },
  company: {
    type: Types.Relationship,
    ref: 'Company',
    initial: true,
    required: true
  }
});

TeamUser.schema.index({ user: 1, team: 1 }, { unique: true });
TeamUser.schema.plugin(uniqueValidator, { message: 'This {PATH} has already been taken' });

// start remove session
TeamUser.schema.pre('remove', async function (next) {
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

TeamUser.schema.pre('remove', async function (next) {
  try {
    const DashboardItem = await keystone.lists.DashboardItem;
    const User = await keystone.lists.User;

    // load user
    const userDoc = await User.model.findById(this.user);

    if (userDoc) {
      const anotherTeam = await TeamUser.model
        .findOne(
          { user: userDoc._id, team: { $ne: this.team } },
          'team',
          { session: this.currentSession }
        );

      // throw new error if this is the last user team
      if (!anotherTeam) {
        const error = new ValidationError(this);
        const message = await APIMessagesExtractor.getError(this._lang, 'user.lastTeam');
        error.errors.team = new ValidatorError({ message });
        return next(error);
      }
      // if current team is not present - set to 1st user team
      if (userDoc.currentTeam.toString() === this.team._id.toString()) {
        userDoc.currentTeam = anotherTeam.team;
        await userDoc.save({ session: this.currentSession });
      }
    }

    // remove dashboard items
    await DashboardItem.model.remove({ user: this.user, team: this.team });

    next();
  } catch (e) {
    /* istanbul ignore next */
    if (this._innerSession) await abortTransaction(this.currentSession);
    /* istanbul ignore next */
    return next(e);
  }
});

// commit remove session
TeamUser.schema.pre('remove', async function (next) {
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

/**
 * Registration
 */
TeamUser.defaultColumns = 'team user company createdAt';
TeamUser.register();

export default TeamUser;
