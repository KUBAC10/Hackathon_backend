import httpStatus from 'http-status';
import moment from 'moment';
import uuid from 'uuid';
import _ from 'lodash';

// models
import {
  TableColumnSettings,
  GlobalConfig,
  User
} from '../../../models';

// services
import APIMessagesExtractor from '../../../services/APIMessagesExtractor';
import { redisClient } from '../../../services/RedisClientBuilder';

// mailers
import resetPasswordMailer from '../../../mailers/resetPassword.mailer';

// helpers
import { initSession } from '../../../helpers/transactions';

// config
import config from '../../../../config/env';

/** PUT /api/v1/user-self */
async function setCurrentTeam(req, res, next) {
  const { team } = req.body;
  try {
    const user = await User.model.findById(req.user._id);
    /* istanbul ignore next */
    // req.user always in this action
    if (!user) return res.sendStatus(httpStatus.BAD_REQUEST);
    user.currentTeam = team;
    await user.save();

    return res.send(user.currentTeam);
  } catch (e) {
    /* istanbul ignore next */
    return next(e);
  }
}

/** POST /api/v1/user-self/table-column-settings */
async function setTableColumnSettings(req, res, next) {
  try {
    const data = req.body;
    // load user
    const user = await User.model
      .findById(req.user._id)
      .populate('tableColumnSettings');

    if (user.tableColumnSettings) {
      Object.assign(user.tableColumnSettings, data);
      await user.tableColumnSettings.save();
    } else {
      const tableColumnSettings = new TableColumnSettings.model(data);
      await tableColumnSettings.save();
      user.tableColumnSettings = tableColumnSettings;
      await user.save();
    }

    return res.json(user.tableColumnSettings);
  } catch (e) {
    /* istanbul ignore next */
    return next(e);
  }
}

/** PUT /api/v1/user-self/update */
async function update(req, res, next) {
  const session = await initSession();
  try {
    const { avatar, ...data } = req.body;

    const user = await User.model.findById(req.user._id);

    /* istanbul ignore if */
    if (!user) return res.sendStatus(httpStatus.BAD_REQUEST);

    Object.assign(user, data);

    /* istanbul ignore if */
    if (avatar || avatar === null) user._avatar = avatar;

    if (user.isModified('email')) {
      const [
        userWithEmail,
        globalConfig
      ] = await Promise.all([
        User.model
          .findOne({ email: user.email })
          .lean(),
        GlobalConfig.model
          .findOne()
          .select('changeEmailLimit')
          .lean()
      ]);

      if (userWithEmail) {
        return res.status(httpStatus.BAD_REQUEST)
          .send({ message: { email: 'User with this email already exists' } });
      }

      // check email changes limit
      const count = _.get(user.emailChangeCount, moment().startOf('day').toString(), 0);

      // throw email change limit error
      if (globalConfig.changeEmailLimit && count >= globalConfig.changeEmailLimit) {
        return res
          .status(httpStatus.BAD_REQUEST)
          .send({ message: { email: 'Exceeded limit of email changes per day' } });
      }

      user.emailChangeCount = { [moment().startOf('day')]: count + 1 };

      user.markModified('emailChangeCount');
    }

    // save user
    await session.withTransaction(async () => await user.save({ session }));

    const userReload = await User.model
      .findById(req.user._id)
      .select('name email phoneNumber address defaultLanguage acceptedAt role defaultTags avatar')
      .populate([
        {
          path: 'address.country',
          select: 'localization'
        },
        {
          path: 'userTeams',
          populate: {
            path: 'team',
            select: 'name'
          }
        },
      ]);

    return res.json(userReload);
  } catch (e) {
    /* istanbul ignore next */
    return next(e);
  }
}

/** PUT /api/v1/user-self/update-password */
async function updatePassword(req, res, next) {
  const { oldPassword, password, confirmPassword } = req.body;
  const { lang } = req.cookies;

  try {
    const user = await User.model.findById(req.user._id);
    return user._.password.compare(oldPassword, async (err, isMatch) => {
      /* istanbul ignore if */
      if (err) return next(err);
      try {
        if (isMatch) {
          if (password !== confirmPassword) {
            const error = await APIMessagesExtractor.getError(lang, 'password.confirm');
            return res.status(httpStatus.BAD_REQUEST)
              .send({ message: { confirmPassword: error } });
          }

          user._req_user = { _id: req.user._id };
          user.password = password;
          await user.save();
          return res.sendStatus(httpStatus.NO_CONTENT);
        }
        const error = await APIMessagesExtractor.getError(lang, 'password.notMatch');
        return res.status(httpStatus.BAD_REQUEST)
          .send({ message: { oldPassword: error } });
      } catch (e) {
        /* istanbul ignore next */
        return next(e);
      }
    });
  } catch (e) {
    /* istanbul ignore next */
    return next(e);
  }
}

/** POST /api/v1/user-self/reset-password */
async function resetPassword(req, res, next) {
  const { email } = req.body;
  const { lang } = req.cookies;
  try {
    const user = await User.model.findOne({ email })
      .lean();

    if (!user) {
      const message = await APIMessagesExtractor.getError(lang, 'user.notRegistered');
      return res.status(httpStatus.NOT_FOUND)
        .send({ message: { email: message } });
    }

    // set reset password token to Redis
    const token = uuid();
    return redisClient.set(`resetPasswordToken:${token}`, user._id.toString(), 'EX', config.ttlResetPasswordToken, (err) => {
      /* istanbul ignore if */
      if (err) return next(err);

      /* istanbul ignore if */
      if (config.env === 'production') {
        resetPasswordMailer({
          token,
          user,
          lang
        });
      }

      return res.sendStatus(httpStatus.ACCEPTED);
    });
  } catch (e) {
    /* istanbul ignore next */
    return next(e);
  }
}

/** PUT /api/v1/user-self/set-password */
async function setPassword(req, res, next) {
  const { password, confirmPassword, resetToken } = req.body;
  const { lang } = req.cookies;

  try {
    if (password !== confirmPassword) {
      const error = await APIMessagesExtractor.getError(lang, 'password.confirm');
      return res.status(httpStatus.BAD_REQUEST)
        .send({ message: { confirmPassword: error } });
    }

    if (!req.user && !resetToken) {
      return res.status(httpStatus.BAD_REQUEST)
        .send({ message: 'User or reset-token is not present' });
    }

    let userId = _.get(req.user, '_id');

    if (resetToken) userId = await redisClient.getAsync(`resetPasswordToken:${resetToken}`);

    /* istanbul ignore if */
    if (!userId) return res.sendStatus(httpStatus.NOT_FOUND);

    const user = await User.model.findById(userId);
    if (!user) return res.sendStatus(httpStatus.NOT_FOUND);

    // forbid to set without reset-token to user with exist password
    if (!resetToken && user.password) return res.sendStatus(httpStatus.BAD_REQUEST);

    user.password = password;
    await user.save();

    return res.sendStatus(httpStatus.NO_CONTENT);
  } catch (e) {
    /* istanbul ignore next */
    return next(e);
  }
}

export default {
  setCurrentTeam,
  setTableColumnSettings,
  update,
  updatePassword,
  resetPassword,
  setPassword
};
