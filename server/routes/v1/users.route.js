import express from 'express';
import validate from '../../controllers/paramsValidation/v1/validation';
import paramValidation from '../../controllers/paramsValidation/v1/users';

// ctrl
import usersCtrl from '../../controllers/api/v1/users.ctrl';

// helpers
import accessControl from '../../helpers/accessControl';
import powerUser from '../../controllers/access/powerUser';

const router = new express.Router();

router.route('/')
/** POST /api/v1/users - Create new user */
  .post(
    accessControl(powerUser()),
    validate(paramValidation.create),
    usersCtrl.create
  );

/** PUT /api/v1/users - Update user */
router.route('/:id')
  .put(
    accessControl(powerUser()),
    validate(paramValidation.update),
    usersCtrl.update
  );

/** DELETE /api/v1/users - Delete user */
router.route('/:id')
  .delete(
    accessControl(powerUser()),
    validate(paramValidation.destroy),
    usersCtrl.destroy
  );

export default router;
