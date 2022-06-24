import passport from 'passport';
import httpStatus from 'http-status';

/**
 * --- Authenticate user by JWT token via passport.js ---
 * required - if argument is true, user should be present
 * if user is authorized - set him in req
 */
export default function userAuthentication(required) {
  return (req, res, next) => {
    passport.authenticate('jwt', { session: false }, (err, user) => {
      if (err) return next(err);
      if (!user && required) return res.sendStatus(httpStatus.UNAUTHORIZED);
      req.user = user;
      return next();
    })(req, res, next);
  };
}
