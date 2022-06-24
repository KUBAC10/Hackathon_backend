import express from 'express';
import validate from '../../controllers/paramsValidation/v1/validation';
import paramValidation from '../../controllers/paramsValidation/v1/dashboard';

// ctrl
import dashboardCtrl from '../../controllers/api/v1/dashboard.ctrl';

// helpers
import accessControl from '../../helpers/accessControl';
import powerUser from '../../controllers/access/powerUser';
import teamUser from '../../controllers/access/teamUser';

const router = new express.Router();

router.route('/summary')
  /** GET /api/v1/dashboards/summary - Get summary for dashboard */
  .get(
    accessControl(powerUser(), teamUser()),
    dashboardCtrl.summary
  );

router.route('/')
  // POST /api/v1/dashboards - create new dashboard
  .post(
    accessControl(powerUser('team'), teamUser('team')),
    validate(paramValidation.create),
    dashboardCtrl.create
  )
  // GET /api/v1/dashboards - get list of dashboards
  .get(
    accessControl(powerUser(), teamUser('team')),
    validate(paramValidation.list),
    dashboardCtrl.list
  );

router.route('/:id')
  // GET /api/v1/dashboards/:id - show dashboard
  .get(
    accessControl(powerUser(), teamUser('team')),
    validate(paramValidation.show),
    dashboardCtrl.show
  )
  // PUT /api/v1/dashboards/:id - update dashboard
  .put(
    accessControl(powerUser(), teamUser('team')),
    validate(paramValidation.update),
    dashboardCtrl.update
  )
  // DELETE /api/v1/dashboards/:id - delete dashboard
  .delete(
    accessControl(powerUser(), teamUser('team')),
    validate(paramValidation.destroy),
    dashboardCtrl.destroy
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

export default router;
