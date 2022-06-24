// models
import {
  Mailer,
  GlobalMailer
} from '../models';

// updates
import createPulseMailers from '../updates/0.0.68-create-pulse-mailers';

export default async function updatePulseMailers(session, next) {
  try {
    const query = {
      type: {
        $in: [
          'pulseCompleted',
          'pulseFirstInvitation',
          'pulseSecondInvitation',
          'pulseReminder',
          'reminderAfterFirstInvitation',
          'reminderAfterSecondInvitation',
          'pulseReminderWithQuestion'
        ]
      }
    };

    await Promise.all([
      Mailer.model.remove(query),
      GlobalMailer.model.remove(query)
    ]);

    await createPulseMailers(next);
  } catch (e) {
    /* istanbul ignore next */
    return next(e);
  }
}
