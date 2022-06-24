import moment from 'moment';
import passport from 'passport';

// passport Strategies
import passportJWT from 'passport-jwt';
import { BasicStrategy } from 'passport-http';
import bearerStrategy from 'passport-http-bearer';
import clientPasswordStrategy from 'passport-oauth2-client-password';

import config from './env';

// models
import {
  User,
  Client,
  AccessToken
} from '../server/models';

// helpers
import { redisClient } from '../server/services/RedisClientBuilder';

const JwtStrategy = passportJWT.Strategy;
const BearerStrategy = bearerStrategy.Strategy;
const ClientPasswordStrategy = clientPasswordStrategy.Strategy;

const cookieExtractor = function (req) {
  let token = null;
  if (req && req.signedCookies) token = req.signedCookies.jwt;
  return token;
};

const params = {
  secretOrKey: config.jwtSecret,
  jwtFromRequest: cookieExtractor,
  passReqToCallback: true,
  ignoreExpiration: true
};

module.exports = function () {
  // Describe JWT Strategy
  const jwtStrategy = new JwtStrategy(params, async (req, payload, done) => {
    try {
      if (req.signedCookies && req.signedCookies.jwt) {
        if (payload.exp > Date.now() / 1000) {
          const result = await redisClient.getAsync(`authToken:${req.signedCookies.jwt}`);
          /* istanbul ignore if */
          if (!result) return done(null, null);

          const user = await User.model.findById(result);
          /* istanbul ignore if */
          if (!user) return done(null, null);

          return done(null, {
            _id: user._id,
            companyId: user.company,
            currentTeam: user.currentTeam,
            isAdmin: user.isAdmin,
            isPowerUser: user.isPowerUser,
            isTemplateMaker: user.isTemplateMaker,
            isLite: user.isLite,
            fakeDataAccess: user.fakeDataAccess
          });
        }
      }

      /* istanbul ignore next */
      return done(null, null);
    } catch (e) {
      /* istanbul ignore next */
      return done(e);
    }
  });

  // Describe Basic Strategy
  const basicStrategy = new BasicStrategy(
    async (clientId, clientSecret, done) => {
      try {
        const client = await Client.model
          .findOne({ clientId, clientSecret })
          .lean();

        if (!client) return done(null, false);
        return done(null, client);
      } catch (e) {
        return done(null, e);
      }
    });

  // Describe Client Password Strategy
  const clientPassowordStrategy = new ClientPasswordStrategy(
    async (clientId, clientSecret, done) => {
      try {
        const client = await Client.model
          .findOne({ clientId, clientSecret })
          .lean();

        if (!client) return done(null, false);
        return done(null, client);
      } catch (e) {
        return done(e);
      }
    });

  // Describe Bearer Strategy
  const bearerStrategy = new BearerStrategy(
    async (token, done) => {
      try {
        // get active access token
        const accessToken = await AccessToken.model
          // TODO: VALIDATE TOKEN WITH TIMEZONE ???
          .findOne({ token, expiredAt: { $gte: moment() } })
          .lean();

        if (!accessToken) return done(null, false);
        return done(null, accessToken);
      } catch (e) {
        return done(e);
      }
    });

  // // passport google oauth 2.0 strategy
  // const googleStrategy = new GoogleStrategy(
  //   {
  // TODO remove test clientId
  //     clientID: '686957378861-45c22c2rqk52f1eifn6gsap28f5gpo4e.apps.googleusercontent.com',
  //     clientSecret: 'JqIMHbzj9UtaUNpIIoEnVpDl', // TODO remove test clientSecret
  //     callbackURL: 'http://localhost:3030/oauth/google/callback', // TODO make correct callbackURI for dev/prod/test env
  //     passReqToCallback: true
  //   },
  //   (req, accessToken, refreshToken, profile, done) => done(null, profile)
  // );

  passport.use(jwtStrategy);
  passport.use(basicStrategy);
  passport.use(bearerStrategy);
  passport.use(clientPassowordStrategy);

  return {
    initialize() {
      return passport.initialize();
    }
  };
};
