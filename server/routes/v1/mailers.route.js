import express from 'express';
import validate from '../../controllers/paramsValidation/v1/validation';
import paramValidation from '../../controllers/paramsValidation/v1/mailers';
import mailersCtrl from '../../controllers/api/v1/mailers.ctrl';

// access control
import accessControl from '../../helpers/accessControl';
import powerUser from '../../controllers/access/powerUser';
import teamUser from '../../controllers/access/teamUser';

const router = new express.Router();

// TODO add tests to all routes
router.route('/')
/** POST /api/v1/mailers/ - Create mailer */
  .post(
    accessControl(powerUser(), teamUser()), // TODO tests
    validate(paramValidation.create),
    mailersCtrl.create
  );

router.route('/:id')
/** PUT /api/v1/mailers/:id - Update mailer */
  .put(
    accessControl(powerUser(), teamUser('createdBy')), // TODO tests
    validate(paramValidation.create),
    mailersCtrl.update
  );

router.route('/:id')
/** DELETE /api/v1/mailers/:id - Delete mailer by id */
  .delete(
    accessControl(powerUser(), teamUser('createdBy')),
    validate(paramValidation.destroy),
    mailersCtrl.destroy
  );

router.route('/template-sample')
/** GET /api/v1/mailers/template-sample - Get mailer template by type */
  .get(
    accessControl(powerUser(), teamUser()),
    validate(paramValidation.templateSample),
    mailersCtrl.templateSample
  );

export default router;
