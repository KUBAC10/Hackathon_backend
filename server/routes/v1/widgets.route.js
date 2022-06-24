import express from 'express';
import validate from '../../controllers/paramsValidation/v1/validation';
import paramValidation from '../../controllers/paramsValidation/v1/widgets';

// ctrl
import widgetsCtrl from '../../controllers/api/v1/widgets.ctrl';

// helpers
import accessControl from '../../helpers/accessControl';
import powerUser from '../../controllers/access/powerUser';
import teamUser from '../../controllers/access/teamUser';

const router = new express.Router();

router.route('/categories')
  // GET /api/v1/widgets/categories - return widget categories list
  .get(
    accessControl(powerUser(), teamUser('team')),
    widgetsCtrl.getCategories
  );

router.route('/categories/:id')
  // GET /api/v1/widget/categories/:id - return widget previews by category
  .get(
    accessControl(powerUser(), teamUser('team')),
    validate(paramValidation.showCategory),
    widgetsCtrl.showCategory
  );

router.route('/')
  // POST /api/v1/widgets - create widget
  .post(
    accessControl(powerUser(), teamUser('team')),
    validate(paramValidation.create),
    widgetsCtrl.create
  );

router.route('/:id')
  // PUT /api/v1/widgets/:id - update widget
  .put(
    accessControl(powerUser(), teamUser('team')),
    validate(paramValidation.update),
    widgetsCtrl.update
  )
  // DELETE /api/v1/widgets/:id - remove widget
  .delete(
    accessControl(powerUser(), teamUser('team')),
    validate(paramValidation.destroy),
    widgetsCtrl.destroy
  )
  // GET /api/v1/widgets/:id - get widget data
  .get(
    accessControl(powerUser(), teamUser('team')),
    validate(paramValidation.data),
    widgetsCtrl.data
  );

// router.route('/')
// /** GET /api/v1/dashboard - Get trend questions list */
//   .get(
//     accessControl(powerUser('team'), teamUser('team')),
//     validate(paramValidation.list),
//     dashboardCtrl.list
//   );
//
// router.route('/items')
// /** POST /api/v1/dashboard/items - Configure trend questions */
//   .post(
//     accessControl(powerUser('team'), teamUser('team')),
//     validate(paramValidation.items),
//     dashboardCtrl.items
//   );
//
// router.route('/coordinates/list')
// /** GET /api/v1/dashboard//coordinates/list - Get list of coordinates for dashboard items*/
//   .get(
//     accessControl(powerUser(), teamUser()),
//     dashboardCtrl.coordinatesList
//   );
//
// router.route('/summary')
// /** GET /api/v1/dashboard/summary - Get summary for dashboard */
//   .get(
//     accessControl(powerUser(), teamUser()),
//     dashboardCtrl.summary
//   );

export default router;
