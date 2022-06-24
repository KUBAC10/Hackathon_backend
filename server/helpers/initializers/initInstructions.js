import passport from 'passport';
import instructions from '../../controllers/instructions/index';

export default function initInstructions(type) {
  return (req, res, next) => {
    const list = req.params.list;

    /* istanbul ignore if */
    if (!instructions[list] || !instructions[list][type]) return res.sendStatus(404);

    const listInstructions = instructions[list][type];

    req.instructions = listInstructions;

    if (listInstructions.auth) {
      if (typeof listInstructions.auth === 'function') return listInstructions.auth(req, res, next);
      /* istanbul ignore next */
      return passport.authenticate('jwt', { session: false })(req, res, next);
    }

    return passport.authenticate('jwt', { session: false }, (err, user) => {
      /* istanbul ignore if */
      if (err) return next(err);
      /* istanbul ignore if */
      if (user) req.user = user;
      next();
    })(req, res, next);
  };
}
