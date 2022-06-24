import express from 'express';
import validate from '../../controllers/paramsValidation/v1/validation';
import paramValidation from '../../controllers/paramsValidation/v1/distribute';

// ctrl
import distributeCtrl from '../../controllers/api/v1/distribute.ctrl';

// helpers
import accessControl from '../../helpers/accessControl';
import powerUser from '../../controllers/access/powerUser';
import teamUser from '../../controllers/access/teamUser';

const router = new express.Router();

router.route('/recipients/:id')
// GET /api/v1/distribute/recipients/:id - find recipients by tag or name
  .get(
    accessControl(powerUser(), teamUser('team')),
    validate(paramValidation.findRecipients),
    distributeCtrl.findRecipients
  )
// PUT /api/v1/distribute/recipients/:id - edit survey campaign recipients
  .put(
    accessControl(powerUser(), teamUser('team')),
    validate(paramValidation.editRecipients),
    distributeCtrl.editRecipients
  );

router.route('/tag/:id')
// GET /api/v1/distribute/tag/:id - show tag emails
  .get(
    accessControl(powerUser(), teamUser('team')),
    validate(paramValidation.showTag),
    distributeCtrl.showTag
  );

router.route('/')
// POST /api/v1/distribute - create survey campaign
  .post(
    accessControl(powerUser(), teamUser('team')),
    validate(paramValidation.create),
    distributeCtrl.create
  )
// GET /api/v1/distribute - get list of survey campaigns
  .get(
    accessControl(powerUser(), teamUser('team')),
    validate(paramValidation.list),
    distributeCtrl.list
  );

router.route('/:id')
// GET /api/v1/distribute/:id - show survey campaign
  .get(
    accessControl(powerUser(), teamUser('team')),
    validate(paramValidation.show),
    distributeCtrl.show
  )
// PUT /api/v1/distribute/:id - update survey campaign
  .put(
    accessControl(powerUser(), teamUser('team')),
    validate(paramValidation.update),
    distributeCtrl.update
  )
// POST /api/v1/distribute/:id - create survey campaign from existed
  .post(
    accessControl(powerUser(), teamUser('team')),
    validate(paramValidation.createFromCopy),
    distributeCtrl.createFromCopy
  )
// DELETE /api/v1/distribute/:id - remove survey campaign
  .delete(
    accessControl(powerUser(), teamUser('team')),
    validate(paramValidation.destroy),
    distributeCtrl.destroy
  );

router.route('/:id/mailer-preview')
  // GET /api/v1/distribute/:id/mailer-preview - show survey campaign
  .get(
    accessControl(powerUser(), teamUser('team')),
    validate(paramValidation.mailerPreview),
    distributeCtrl.mailerPreview
  );

router.route('/:id/rounds')
  // GET /api/v1/distribute/:id/rounds - get list of rounds
  .get(
    accessControl(powerUser(), teamUser('team')),
    validate(paramValidation.roundsList),
    distributeCtrl.roundsList
  );

router.route('/:id/rounds/:roundId')
  // PUT /api/v1/distribute/:id/rounds/:roundId - update round
  .put(
    accessControl(powerUser(), teamUser('team')),
    validate(paramValidation.updateRound),
    distributeCtrl.updateRound
  );

router.route('/:id/rounds/:roundId/send-reminders')
  // POST /api/v1/distribute/:id/rounds/:roundId/send-reminders - send reminders
  .post(
    accessControl(powerUser(), teamUser('team')),
    validate(paramValidation.sendReminders),
    distributeCtrl.sendReminders
  );

router.route('/unsubscribe/:token')
  // GET /api/v1/distribute/unsubscribe/:token - unsubscribe user onto distribute
  .get(
    validate(paramValidation.unsubscribe),
    distributeCtrl.unsubscribe
  );

export default router;
