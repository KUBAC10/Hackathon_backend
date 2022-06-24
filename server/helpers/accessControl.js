import passport from 'passport';
import httpStatus from 'http-status';
import asyncSome from 'async/some';

/**
 * --- Manage permission by user roles ---
 * roles - permitted arguments - functions
 *
 * --- Roles ---
 * Invoke each function with args - (user, req) => { ... }
 * should return true if access if allowed
 */
export default function accessControl(...roles) {
  // check if roles is only functions
  if (roles.some(role => typeof role !== 'function')) {
    throw new Error('Access Control: role should be only function');
  }

  return (req, res, next) => {
    passport.authenticate('jwt', { session: false }, (err, user) => {
      if (err) return next(err);
      if (!user) return res.sendStatus(httpStatus.UNAUTHORIZED);

      // if some of role return true - proceed
      asyncSome(roles, (role, callback) => {
        // process role
        role(user, req, (err, result) => {
          if (err) return callback(err);
          return callback(null, result);
        });
      }, (err, success) => {
        if (err) return next(err);
        if (success) {
          // mount user to req object
          req.user = user;
          return next();
        }

        return res.sendStatus(httpStatus.FORBIDDEN);
      });
    })(req, res, next);
  };
}
