import moment from 'moment/moment';
import express from 'express';
import passport from 'passport/lib';
import oauth2orize from 'oauth2orize/lib';

// models
import { AccessToken } from '../../models';

// config
import config from '../../../config/env';


const router = new express.Router();

// create OAuth 2.0 server
const server = oauth2orize.createServer();

server.exchange(oauth2orize.exchange.clientCredentials(async (client, scope, done) => {
  try {
    const token = AccessToken.model.generateToken();
    const tokenTTL = config.ttlAccessToken;
    // Pass in a null for user id since there is no user when using this grant type
    const accessToken = new AccessToken.model({
      token,
      client,
      expiredAt: moment().add(tokenTTL, 'seconds'),
      company: client.company
    });
    await accessToken.save();
    return done(null, token);
  } catch (e) {
    /* istanbul ignore next */
    return done(e);
  }
}));

/**
 * User Credentials
 * ================
 */
router.route('/token')
/** POST /oauth/token - Exchange client credentials to access token */
  .post(
    passport.authenticate(['basic', 'oauth2-client-password'], { session: false }),
    server.token(),
    server.errorHandler(),
  );

// /**
//  * Google Api
//  * ================
//  */
// router.route('/google')
//   .get(
//     passport.authenticate('google', {
//       session: false,
//       scope: ['profile']
//     })
//   );
//
// // callback url upon successful google authentication
// router.route('/google/callback')
//   .get(
//     passport.authenticate('google', {
//       session: false,
//       failureRedirect: '/login' // TODO set correct failureRedirect URI
//     }),
//     async (req, res, next) => {
//       try {
//         // get email
//         const email = req.user._json.email;
//
//         // find user
//         const user = await User.model.findOne({ email });
//
//         // redirect to registration from
//         if (!user) {
//           // TODO redirect to registration form
//         }
//
//         // create payload
//         const payload = { _id: user._id };
//
//         // sign jwt token
//         const token = jwt.sign(payload, config.jwtSecret, {
//           expiresIn: '24h' // expires in 24 hours
//         });
//
//         // set jwt token to redis
//         await redisClient.setAsync(
//           `authToken:${token}`,
//           user._id.toString(),
//           'EX',
//           config.ttlAuthToken
//         );
//
//         // set jwt token to cookies
//         res.cookie('jwt', token, { signed: true, httpOnly: true, sameSite: true });
//
//         // pick user data
//         const userData = _.pick(user, [
//           '_id', 'name', 'email', 'address', 'phoneNumber',
//           'defaultLanguage', 'userTeams', 'tableColumnSettings',
//           'isAdmin', 'isPowerUser', 'isTemplateMaker',
//           'removingDate', 'company', 'acceptedAt', 'currentTeam'
//         ]);
//
//         // user authorized response
//         return res.json({
//           ...userData,
//           expiresAt: moment().add(1, 'days').subtract(30, 'seconds')
//         });
//       } catch (e) {
//         return next(e);
//       }
//     }
//   );

router.use('/oauth2', router);

export default router;
