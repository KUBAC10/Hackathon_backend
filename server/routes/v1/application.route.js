import express from 'express';

// ctrl
import applicationCtrl from '../../controllers/api/v1/application.ctrl';

// helpers
import validate from '../../controllers/paramsValidation/v1/validation';
import initKeystoneList from '../../helpers/initializers/initKeystoneList';
import initInstructions from '../../helpers/initializers/initInstructions';
import paramValidation from '../../controllers/paramsValidation/application';

const router = new express.Router();

router.route('/:list')
/** GET /api/v1/:list - Show list of entities */
  .get(
    initKeystoneList,
    initInstructions('list'),
    (req, res, next) => validate(paramValidation[req.params.list].list)(req, res, next),
    applicationCtrl.list
  )

  /** POST /api/v1/:list - Create new entity */
  .post(
    initKeystoneList,
    initInstructions('create'),
    (req, res, next) => validate(paramValidation[req.params.list].create)(req, res, next),
    applicationCtrl.create
  );

router.route('/:list/:id')
/** GET /api/v1/:list/:id - Show entity by ID */
  .get(
    initKeystoneList,
    initInstructions('show'),
    (req, res, next) => validate(paramValidation[req.params.list].show)(req, res, next),
    applicationCtrl.show
  )

  /** PUT /api/v1/:list/:id - Update entity by ID */
  .put(
    initKeystoneList,
    initInstructions('update'),
    (req, res, next) => validate(paramValidation[req.params.list].update)(req, res, next),
    applicationCtrl.update
  )

  /** DELETE /api/v1/:list/:id - Delete entity by ID */
  .delete(
    initKeystoneList,
    initInstructions('destroy'),
    (req, res, next) => validate(paramValidation[req.params.list].destroy)(req, res, next),
    applicationCtrl.destroy
  );

export default router;
