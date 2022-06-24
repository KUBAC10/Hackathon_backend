import httpStatus from 'http-status';
import jwt from 'jsonwebtoken';
import moment from 'moment';
import uuid from 'uuid/v4';
import _ from 'lodash';

// models
import {
  User,
  Team,
  Company,
} from '../../../models';

// config
import config from '../../../../config/env';

// mailers
import userRegistrationMailer from '../../../mailers/userRegistration.mailer';
import confirmCompanyMailer from '../../../mailers/confirmCompany.mailer';

// services
import { APIMessagesExtractor } from '../../../services';
import { redisClient } from '../../../services/RedisClientBuilder';

// helpers
import { initSession } from '../../../helpers/transactions';
import { userResponse, userAuthProcess } from './authentication.ctrl';

// mailer
import confirmEmailMailer from '../../../mailers/confirmEmail.mailer';

// TODO remove unused
/** POST /api/v1/registration */
async function create(req, res, next) {
  const { lang } = req.cookies;
  const { companyAttrs, teamAttrs, userAttrs } = req.body;
  const session = await initSession();
  try {
    const company = new Company.model({ ...companyAttrs });
    const team = new Team.model({ ...teamAttrs, company });

    await session.withTransaction(async () => {
      // create new company
      await company.save({ session });
      // create new team
      await team.save({ session });
    });

    // create new User
    const user = new User.model({
      ...userAttrs,
      company,
      currentTeam: team,
      isPowerUser: true
    });
    await user.save();

    // generate and set confirmation token to Redis
    const token = uuid();
    await redisClient.setAsync(`userConfirmationToken:${token}`, user._id.toString(), 'EX', config.ttlConfirmationToken);
    /* istanbul ignore if */
    if (config.env === 'production') {
      userRegistrationMailer({
        name: user.name,
        email: user.email,
        token,
        lang
      });
    }

    const message = await APIMessagesExtractor.getMessage(lang, 'registration.success');
    return res.status(httpStatus.OK).send({ message });
  } catch (e) {
    /* istanbul ignore next */
    return next(e);
  }
}

// TODO remove unused
/** POST /api/v1/registration/confirm/user */
async function confirmUser(req, res, next) {
  try {
    const { lang } = req.cookies;
    const { confirmationToken, password, confirmPassword } = req.body;
    // get userId
    const userId = await redisClient.getAsync(`userConfirmationToken:${confirmationToken}`);
    if (!userId) return res.sendStatus(httpStatus.BAD_REQUEST);
    // load user
    const user = await User.model.findOne({ _id: userId, acceptedAt: { $eq: null } });
    if (!user) return res.sendStatus(httpStatus.BAD_REQUEST);
    // compare password
    if (password !== confirmPassword) {
      const error = await APIMessagesExtractor.getError(lang, 'password.confirm');
      return res.status(httpStatus.BAD_REQUEST)
        .send({ message: { passwordConfirm: error } });
    }
    // approve user and set password
    user.password = password;
    user.acceptedAt = moment();
    await user.save();
    // create token payload
    const payload = {
      id: user._id,
      companyId: user.company,
      isAdmin: user.isAdmin,
      isPowerUser: user.isPowerUser,
    };
    // generate token
    const token = jwt.sign(payload, config.jwtSecret, {
      expiresIn: '24h' // expires in 24 hours
    });
    // auth user
    // set token to redis
    await redisClient.setAsync(`authToken:${token}`, user._id.toString(), 'EX', config.ttlAuthToken);
    res.cookie('jwt', token, { signed: true, httpOnly: true, sameSite: true });
    return userResponse(user, res);
  } catch (e) {
    /* istanbul ignore next */
    return next(e);
  }
}

// TODO remove unused
/** POST /api/v1/registration/confirm/company */
async function confirmCompany(req, res, next) {
  try {
    const { lang } = req.cookies;
    const { confirmationToken } = req.body;
    const companyId = await redisClient.getAsync(`companyConfirmationToken:${confirmationToken}`);
    if (!companyId) return res.sendStatus(httpStatus.BAD_REQUEST);
    // load company
    const company = await Company.model.findOne({ _id: companyId, acceptedAt: { $eq: null } });
    if (!company) return res.sendStatus(httpStatus.BAD_REQUEST);
    // confirm company
    company.acceptedAt = moment();
    await company.save();
    // send message - your company email was successfully confirmed
    const message = await APIMessagesExtractor.getMessage(lang, 'company.confirm');
    return res.status(httpStatus.OK).send({ message });
  } catch (e) {
    /* istanbul ignore next */
    return next(e);
  }
}

// TODO remove unused
/** POST /api/v1/registration/confirm/request-company */
async function requestCompany(req, res, next) {
  try {
    const { lang } = req.cookies;
    const { companyId } = req.body;
    // get company
    const company = await Company.model.findOne({ _id: companyId, acceptedAt: { $eq: null } });
    if (!company) return res.sendStatus(httpStatus.BAD_REQUEST);
    // generate and set confirmation token to Redis
    const token = uuid();
    await redisClient.setAsync(`companyConfirmationToken:${token}`, company._id.toString(), 'EX', config.ttlConfirmationToken);
    // send company confirmation mailer
    /* istanbul ignore if */
    if (config.env === 'production') {
      confirmCompanyMailer({
        name: company.name,
        email: company.email,
        token,
        lang
      });
    }
    return res.sendStatus(httpStatus.OK);
  } catch (e) {
    /* istanbul ignore next */
    return next(e);
  }
}

/** POST /api/v1/registration/lite */
async function lite(req, res, next) {
  try {
    const { email, firstName, lastName, password } = req.body;
    const { lang } = req.cookies;

    let user = await User.model
      .findOne({ email })
      .lean();

    // return message if user with this email already exists
    if (user) {
      return res
        .status(httpStatus.BAD_REQUEST)
        .send({ message: { email: 'User with this email already exists' } });
    }

    user = await User.model.createLite({ email, firstName, lastName, password });

    return userAuthProcess(lang, user, password, res, next);
  } catch (e) {
    /* istanbul ignore next */
    return next(e);
  }
}

/** GET /api/v1/registration/confirm/:token */
async function confirmEmail(req, res, next) {
  const session = await initSession();
  try {
    const { token } = req.params;

    // get token from redis
    const result = await redisClient.getAsync(`confirmEmailToken:${token}`);

    if (!result) return res.sendStatus(httpStatus.BAD_REQUEST);

    // remove token from redis
    await redisClient.delAsync(`confirmEmailToken:${token}`);

    // find user and confirm email
    const user = await User.model.findById(result);

    if (!user) return res.sendStatus(httpStatus.NOT_FOUND);

    user.acceptedAt = new Date();

    // save user
    await session.withTransaction(async () => await user.save({ session }));

    // authorize user return user data in response
    const payload = {
      _id: user._id
    };

    const authToken = jwt.sign(payload, config.jwtSecret, {
      expiresIn: '24h' // expires in 24 hours
    });

    // set token to redis
    await redisClient.setAsync(`authToken:${authToken}`, user._id.toString(), 'EX', config.ttlAuthToken);

    res.cookie('jwt', authToken, { signed: true, httpOnly: true, sameSite: true });

    return userResponse(user, res);
  } catch (e) {
    /* istanbul ignore next */
    return next(e);
  }
}

/** GET /api/v1/registration/resend-confirm-email */
async function resendConfirmEmail(req, res, next) {
  try {
    const { _id } = req.user;

    // find user
    const user = await User.model
      .findOne({ _id })
      .lean();

    // create confirmation token
    const token = uuid();

    // set token to redis
    await redisClient.setAsync(`confirmEmailToken:${token}`, user._id.toString(), 'EX', config.ttlConfirmationToken);

    // send confirm url to email
    confirmEmailMailer({ token, email: user.email });

    return res.sendStatus(httpStatus.OK);
  } catch (e) {
    /* istanbul ignore next */
    return next(e);
  }
}

// TODO test
/** PUT /api/v1/registration/lite  */
async function update(req, res, next) {
  const session = await initSession();
  try {
    const { role, defaultTags, ...data } = req.body;
    const { companyId } = req.user;

    const [
      company,
      user
    ] = await Promise.all([
      Company.model.findOne({ _id: companyId }),
      User.model.findOne({ _id: req.user._id })
    ]);

    if (!company || !user) return res.sendStatus(httpStatus.NOT_FOUND);

    Object.assign(company, data);
    Object.assign(user, _.pickBy({ role, defaultTags }, _.identity));


    await session.withTransaction(async () => {
      await company.save({ session });
      await user.save({ session });
    });

    const reloadUser = await User.model
      .findOne({ _id: req.user._id })
      .populate('company')
      .lean();

    return res.send(reloadUser);
  } catch (e) {
    /* istanbul ignore next */
    return next(e);
  }
}

export default {
  create,
  confirmUser,
  confirmCompany,
  requestCompany,
  lite,
  confirmEmail,
  resendConfirmEmail,
  update
};
