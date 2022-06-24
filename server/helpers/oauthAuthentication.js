import passport from 'passport';
import httpStatus from 'http-status';

/**
 * --- Authenticate user by Access Token via passport.js ---
 * Check Company id of Client which associated with access token.
 */
export default function oauthAuthentication() {
  return (req, res, next) => {
    passport.authenticate('bearer', { session: false }, (error, accessToken) => {
      if (error) return next(error);
      // Check that access token associated with .
      if (!accessToken.company) return res.sendStatus(httpStatus.UNAUTHORIZED);
      return next();
    })(req, res, next);
  };
}
