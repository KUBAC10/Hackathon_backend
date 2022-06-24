import { promises as fs } from 'fs';
import keystone from 'keystone';
import uuid from 'uuid';
import _ from 'lodash';

// helpers
import { initSession } from '../helpers/transactions';
import generateRoundCandidates from '../helpers/generateRoundCandidates';

// config
import config from '../../config/env';

// helpers
import parseTpl from '../helpers/parse-es6-template';

// mailer
import pulseReminderMailer from '../mailers/pulseReminde.mailer';
import { getPassTime } from '../mailers/pulseRoundMailer';

const Types = keystone.Field.Types;

/**
 * PulseSurveyRound Model
 * ===========
 */

const PulseSurveyRound = new keystone.List('PulseSurveyRound', {
  track: true,
  defaultSort: '-createdAt'
});

PulseSurveyRound.add({
  surveyCampaign: {
    type: Types.Relationship,
    ref: 'SurveyCampaign'
  },
  survey: {
    type: Types.Relationship,
    ref: 'Survey'
  },
  startDate: {
    type: Types.Date,
    utc: true
  },
  endDate: {
    type: Types.Date,
    utc: true
  },
  dayOfWeek: {
    type: Types.Select,
    options: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
  },
  status: {
    type: Types.Select,
    options: ['active', 'completed'],
    default: 'active'
  },
  remindersCounter: {
    type: Number,
    default: 0
  },
  sortableId: {
    type: Number,
    default: 0
  },
  reminderSent: {
    type: Boolean
  }
});

PulseSurveyRound.schema.virtual('pulseSurveyRoundResults', {
  ref: 'PulseSurveyRoundResult',
  localField: '_id',
  foreignField: 'pulseSurveyRound'
});

PulseSurveyRound.schema.virtual('employees', {
  ref: 'PulseSurveyRoundResult',
  localField: '_id',
  foreignField: 'pulseSurveyRound',
  count: true
});

// process round -> create PulseSurveyRoundResult for each PulseSurveyRecipient
PulseSurveyRound.schema.methods.process = async function () {
  const session = await initSession();
  const {
    Survey,
    SurveyCampaign,
    PulseSurveyRecipient,
    PulseSurveyRoundResult
  } = keystone.lists;

  const result = {
    processed: {},
    skipped: {}
  };

  await session.withTransaction(async () => {
    // load campaign
    const surveyCampaign = await SurveyCampaign
      .model
      .findOne({ survey: this.survey })
      .lean();
    const { questionPerSurvey } = surveyCampaign;

    // load survey with active drivers / surveyItems
    const survey = await Survey.model
      .findOne({
        _id: this.survey,
        inTrash: { $ne: true }
      })
      .populate([
        {
          path: 'pulseSurveyDrivers',
          match: {
            inDraft: { $ne: true },
            active: true
          },
        }, {
          path: 'surveySections',
          sort: { sortableId: 1 },
          match: {
            inDraft: { $ne: true },
            hide: { $ne: true }
          },
          populate: {
            path: 'surveyItems',
            sort: { sortableId: 1 },
            match: {
              inTrash: { $ne: true },
              inDraft: { $ne: true },
              hide: { $ne: true }
            },
            populate: {
              path: 'pulseSurveyDriver',
              select: 'active'
            }
          }
        }
      ])
      .lean();

    if (!survey) return;

    const { pulseSurveyDrivers, surveySections = [] } = survey;

    const surveyItems = surveySections.reduce((acc, section) => {
      const { surveyItems = [] } = section;

      return [
        ...acc,
        ...surveyItems.filter(item => item.pulseSurveyDriver && item.pulseSurveyDriver.active)
      ];
    }, []);

    // round map
    const currentSurveyItemsMap = {};

    // load recipients
    const recipients = await PulseSurveyRecipient
      .model
      .find({ surveyCampaign: this.surveyCampaign._id }, '_id surveyItemsMap email tags');

    for (const recipient of recipients) {
      // check if recipient is already processed for this round
      const roundResultExist = await PulseSurveyRoundResult
        .model
        .findOne({
          recipient: recipient._id,
          survey: this.survey,
          pulseSurveyRound: this._id
        })
        .lean();

      if (roundResultExist) {
        result.skipped[recipient._id] = true;
      } else {
        // TODO handle to not send campaign, if not active drivers / sections / questions !!!!!
        if (!pulseSurveyDrivers.length) {
          result.skipped[recipient._id] = true;
          return result;
        }

        // process round for recipient
        recipient.surveyItemsMap = recipient.surveyItemsMap || {};
        // check rounds candidates
        const candidates = generateRoundCandidates({
          pulseSurveyDrivers,
          questionPerSurvey,
          recipient,
          surveyItems,
          currentSurveyItemsMap
        });

        // TODO handle to not send campaign, if not active drivers / sections / questions !!!!!
        if (!Object.keys(candidates).length) {
          result.skipped[recipient._id] = true;
          return result;
        }
        // save recipient data
        await recipient.save({ session });
        // create round result
        const roundResult = new PulseSurveyRoundResult.model({
          recipient,
          survey: this.survey,
          surveyCampaign: surveyCampaign._id,
          pulseSurveyRound: this._id,
          token: uuid(),
          tags: recipient.tags
        });
        // attach survey items map to round
        roundResult.surveyItemsMap = candidates;
        await roundResult.save({ session });
        result.processed[recipient._id] = true;
      }
    }
  });

  return result;
};

// TODO test
// send reminders to recipients
PulseSurveyRound.schema.methods.sendReminders = async function (options = {}) {
  try {
    const { participation = false } = options;

    const {
      Mailer,
      SurveyResult,
      SurveyCampaign,
      PulseSurveyRecipient,
    } = keystone.lists;

    // send only on first round
    let mailerType = 'reminderAfterFirstInvitation';

    // count rounds
    const roundsCount = await PulseSurveyRound.model
      .find({
        _id: { $ne: this._id },
        surveyCampaign: this.surveyCampaign
      })
      .countDocuments();

    // get random mailer reminder type if rounds not first
    if (roundsCount) {
      mailerType = _.sample(['pulseReminder', 'reminderAfterSecondInvitation', 'pulseReminderWithQuestion']);
    }

    // load campaign and mailer
    const [
      campaign,
      mailer
    ] = await Promise.all([
      SurveyCampaign.model
        .findOne({ _id: this.surveyCampaign })
        .populate('company')
        .lean(),
      Mailer.model
        .findOne({ type: mailerType })
        .lean()
    ]);

    if (!mailer || !campaign) return;

    // init query for recipients
    const query = { surveyCampaign: this.surveyCampaign };

    // exclude recipients who not started round
    if (participation) {
      const surveyResults = await SurveyResult.model
        .find({ pulseSurveyRound: this._id })
        .select('recipient')
        .lean();

      query._id = { $nin: surveyResults.map(i => i.recipient) };
    }

    let customerTextBlock;

    // load and parse custom test block for mailer
    if (campaign.reminderMailerCustomText) {
      const template = await fs.readFile('server/mailers/pulseMailers/customerTextBlock.html', 'utf8');

      customerTextBlock = parseTpl(template, {
        customerText: campaign.reminderMailerCustomText
      }, '');
    }

    // load recipients for reminding
    const recipients = await PulseSurveyRecipient.model
      .find(query)
      .populate('contact')
      .lean();

    // iterate recipients and sed reminders
    for (const recipient of recipients) {
      const { template, subject, _id } = mailer;

      await pulseReminderMailer({
        campaign,
        mailer: { template, subject, _id },
        data: {
          customerTextBlock,
          facebook: 'https://www.facebook.com/screverr',
          linkedin: 'https://www.linkedin.com/company/screver/',
          instagram: 'https://www.instagram.com/screverr/',
          home: config.hostname,
          passTime: getPassTime(campaign.questionPerSurvey),
          terms: 'https://screver.com/terms-conditions/',
          privacy: 'https://screver.com/privacy-policy/',
          signIn: 'https://app.screver.com/',
          hostname: config.hostname,
          companyName: campaign.company.name,
          numberOfQuestions: campaign.questionPerSurvey
        },
        recipient,
        round: this.toObject()
      });
    }

    this.remindersCounter = recipients.length;

    await this.save();
  } catch (e) {
    console.log(`Pulse Survey Round send reminders: ${e}`);
  }
};

// complete round
PulseSurveyRound.schema.methods.complete = async function (options) {
  this.status = 'completed';
  await this.save(options);
};

/**
 * Registration
 */
PulseSurveyRound.defaultColumns = 'startDate endDate dayOfWeek status';
PulseSurveyRound.register();

export default PulseSurveyRound;
