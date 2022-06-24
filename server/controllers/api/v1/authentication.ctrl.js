import jwt from 'jsonwebtoken';
import moment from 'moment';
import httpStatus from 'http-status';
import _ from 'lodash';
import superagent from 'superagent';

// models
import { User } from '../../../models';

// config
import config from '../../../../config/env';

// services
import { APIMessagesExtractor } from '../../../services';
import { redisClient } from '../../../services/RedisClientBuilder';

/** POST /api/v1/authentication */
async function login(req, res, next) {

  const { login, password } = req.body;
  const { lang } = req.cookies;

  try {
    let data = {};

    if (!login) return _dataIsRequired(lang, res);

    if (!_validateEmail(login)) return _invalidLoginData(lang, res);

    data = {
      email: login.toLowerCase(),
      password: { $exists: true, $ne: null } // check if password is present
    };

    // Find user with granted email or phone number
    const user = await _loadUser(data);

    // Auth user
    //if (user ) {
       if (user && user.currentTeam) {       /////////////////////////////////////////////////////////////////////////////////////////////////////////
      return userAuthProcess(lang, user, password, res, next);
    }

    // Return error for invalid credentials
    return _incorrectLogin(lang, res);
  } catch (e) {
    /* istanbul ignore next */
    return next(e);
  }
}

/** DELETE /api/v1/authentication */
async function logout(req, res, next) {
  try {
    const { lang } = req.cookies;

    if (req.signedCookies && req.signedCookies.jwt) {
      const token = req.signedCookies.jwt;
      res.clearCookie('jwt');
      const reply = await redisClient.existsAsync(`authToken:${token}`);
      if (reply === 1) {
        await redisClient.delAsync(`authToken:${token}`);
        return res.sendStatus(httpStatus.OK);
      }
      return _incorrectInformationResponse(lang, res);
    }
    return _incorrectInformationResponse(lang, res);
  } catch (e) {
    /* istanbul ignore next */
    return next(e);
  }
}

/** GET /api/v1/authentication */
async function validate(req, res, next) {
  const { lang } = req.cookies;

  if (req.signedCookies && req.signedCookies.jwt) {
    const token = req.signedCookies.jwt;
    return jwt.verify(token, config.jwtSecret, async (err, decoded) => {
      try {
        if (err) {
          if (err.message === 'jwt expired') {
            res.clearCookie('jwt');
            return _incorrectInformationResponse(lang, res);
          }
          return next(err);
        }

        if (decoded._id) {
          const result = await redisClient.existsAsync(`authToken:${token}`);
          // Return success response if token is valid and still exists in Redis
          if (result === 1) {
            const doc = await _loadUser({ _id: decoded._id }, true);

            if (!doc) {
              res.clearCookie('jwt');
              return _incorrectInformationResponse(lang, res);
            }
            return userResponse(doc, res);
          }
          return _incorrectInformationResponse(lang, res);
        }
        return _incorrectInformationResponse(lang, res);
      } catch (e) {
        /* istanbul ignore next */
        return next(e);
      }
    });
  }
  return _incorrectInformationResponse(lang, res);
}

export function userAuthProcess(lang, user, password, res, next) {
  return user._.password.compare(password, async (err, isMatch) => {
    if (err) return next(err);
    try {
      if (isMatch) return await _authUser(user, res);
      return _incorrectPassword(lang, res);
    } catch (e) {
      /* istanbul ignore next */
      return next(e);
    }
  });
}

export function userResponse(user, res) {
  const userData = _.pick(user, [
    '_id', 'name', 'email', 'address', 'phoneNumber', 'defaultLanguage', 'userTeams', 'tableColumnSettings', 'fakeDataAccess',
    'isAdmin', 'isPowerUser', 'isTemplateMaker', 'isLite', 'removingDate', 'company', 'acceptedAt', 'currentTeam', 'avatar',
    'isSocialNew'
  ]);

  return res.json({
    ...userData,
    hasPassword: !!user.password,
    hasGoogle: !!user.googleId,
    hasLinkedin: !!user.linkedinId,
    expiresAt: moment()
      .add(1, 'days')
      .subtract(30, 'seconds')
  });
}

async function _incorrectPassword(lang, res) {
  // Errors
  const incorrectPassword = await APIMessagesExtractor.getError(lang, 'password.isWrong');

  return res.status(httpStatus.BAD_REQUEST)
    .send({
      message: {
        password: incorrectPassword
      }
    });
}

async function _incorrectLogin(lang, res) {
  // Errors
  const incorrectEmail = await APIMessagesExtractor.getError(lang, 'global.incorrectInformation');

  return res.status(httpStatus.BAD_REQUEST)
    .send({
      message: {
        login: incorrectEmail
      }
    });
}

async function _incorrectInformationResponse(lang, res) {
  // Errors
  const incorrectInformation = await APIMessagesExtractor.getError(lang, 'global.incorrectInformation');

  return res.status(httpStatus.UNAUTHORIZED)
    .send({
      error: incorrectInformation
    });
}

async function _dataIsRequired(lang, res) {
  // Errors
  const dataIsRequired = await APIMessagesExtractor.getError(lang, 'global.emailOrPhoneNumber');

  return res.status(httpStatus.BAD_REQUEST)
    .send({
      message: {
        login: dataIsRequired
      }
    });
}

async function _invalidLoginData(lang, res) {
  // Errors
  const invalidData = await APIMessagesExtractor.getError(lang, 'global.incorrectLoginFormat');

  return res.status(httpStatus.BAD_REQUEST)
    .send({
      message: {
        login: invalidData
      }
    });
}

function _validateEmail(email) {
  const re = /[^\s@]+@[^\s@]+\.[^\s@]+/;
  return re.test(email.toLowerCase());
}

/** POST /api/v1/authentication/oauth */
async function oAuth(req, res, next) {
  try {
    const { code, provider } = req.body;
    const { hostname } = config;

    const { url, processToken, ...providerData } = _handleProviderData(provider);

    // process code exchange
    const exchangeRequest = await superagent
      .post(
        url,
        {
          code,
          redirect_uri: `${hostname}/auth/callback`,
          grant_type: 'authorization_code',
          ...providerData
        }
      )
      .set('Content-Type', 'application/x-www-form-urlencoded');

    const { id, firstName, lastName } = await processToken(exchangeRequest.body);

    if (!id) {
      return res.status(400)
        .send({ message: 'Id is not present' });
    }

    // find user by provider id
    let user = await _loadUser({ [`${provider}Id`]: id }, true);
    // create new user if not present
    if (!user) {
      await User.model.createLite({ provider, id, firstName, lastName });
      // reload user
      user = await _loadUser({ [`${provider}Id`]: id }, true);

      // set flag if user is just created
      user.isSocialNew = true;
    }

    return _authUser(user, res);
  } catch (e) {
    console.log(e);
    return next(e);
  }
}

function _handleProviderData(provider) {
  switch (provider) {
    case 'linkedin':
      return {
        url: 'https://www.linkedin.com/oauth/v2/accessToken',
        client_id: config.linkedinClientId,
        client_secret: config.linkedinSecret,
        processToken: async (data) => {
          const { access_token } = data;
          // get user data
          const userDataRequest = await superagent
            .get('https://api.linkedin.com/v2/me')
            .set('Authorization', `Bearer ${access_token}`);

          const {
            id,
            localizedFirstName: firstName,
            localizedLastName: lastName
          } = userDataRequest.body;

          return { id, firstName, lastName };
        }
      };
    case 'google':
      return {
        url: 'https://oauth2.googleapis.com/token',
        client_id: config.googleClientId,
        client_secret: config.googleSecret,
        processToken: async (data) => {
          const { access_token, id_token } = data;
          // get user data
          const userDataRequest = await superagent
            .get('https://oauth2.googleapis.com/tokeninfo', { id_token })
            .set('Authorization', `Bearer ${access_token}`);

          const { sub: id, given_name: firstName, family_name: lastName } = userDataRequest.body;

          return { id, firstName, lastName };
        }
      };
    default:
      return {};
  }
}

// user load query
function _loadUser(query, lean) {

  const initialQuery = User
    .model
    .findOne(query)
    .populate([
      {
        path: 'userTeams',
        populate: { path: 'team', select: 'name' }
      },
      { path: 'tableColumnSettings', },
      {
        path: 'company',
        populate: [{ path: 'companyColors' }]
      }
    ]);

  if (lean) initialQuery.lean();

  return initialQuery;
}


// sign JWT auth token to user and process JSON user response
async function _authUser(user, res) {
  try {
    const payload = {
      _id: user._id
    };

    const token = jwt.sign(payload, config.jwtSecret, {
      expiresIn: '30d' // expires in 30 days
    });

    // set token to redis
    await redisClient.setAsync(`authToken:${token}`, user._id.toString(), 'EX', config.ttlAuthToken);

    // set jwt cookie
    res.cookie('jwt', token, { signed: true, httpOnly: true, sameSite: true });

    // return user data
    return userResponse(user, res);
  } catch (e) {
    return Promise.reject(e);
  }
}

export default {
  login,
  logout,
  validate,
  oAuth
};
