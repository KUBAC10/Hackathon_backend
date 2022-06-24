import keystone from 'keystone';
import moment from 'moment';
import _ from 'lodash';

// models
import {
  Survey,
  TagEntity
} from '../models';

// helpers
import { loadPreviewSurveySections } from '../controllers/helpers/draftLoaders';

// validator
import { metaValidator } from '../helpers/validators';

const Types = keystone.Field.Types;

/**
 * Invite Model
 * ============
 */

const Invite = new keystone.List('Invite', {
  track: true,
  defaultSort: '-createdAt'
});

Invite.add({
  company: {
    type: Types.Relationship,
    ref: 'Company'
  },
  team: {
    type: Types.Relationship,
    ref: 'Team'
  },
  contact: {
    type: Types.Relationship,
    ref: 'Contact',
    // TODO add some required validation
    // required: true,
    initial: true
  },
  email: {
    type: String,
    lowercase: true,
    initial: true,
    trim: true
  },
  survey: {
    type: Types.Relationship,
    ref: 'Survey',
    required: true,
    initial: true
  },
  token: {
    type: String,
    default: 0,
    note: 'Unique invitation token',
    index: true
  },
  ttl: {
    type: Number,
    note: 'Token time to live'
  },
  user: {
    type: Types.Relationship,
    ref: 'User'
  },
  type: {
    type: Types.Select,
    options: 'global, team, company',
  },
  preview: {
    type: Boolean,
    initial: true,
    default: false,
  },
  target: {
    type: Types.Relationship,
    ref: 'Target'
  },
  surveyCampaign: {
    type: Types.Relationship,
    ref: 'SurveyCampaign'
  },
  tags: {
    type: Types.Relationship,
    ref: 'Tag',
    many: true
  },
  expiredAt: {
    type: Types.Datetime,
    initial: true,
    default () {
      if (this.ttl) return moment(this.createdAt).add(this.ttl);
    }
  }
});

Invite.schema.add({ surveyItemsMap: { type: Object } });

// add meta
Invite.schema.add({ meta: { type: Object } });

// Indexes
Invite.schema.index({ contact: 1, survey: 1 });

// Validate meta
Invite.schema.pre('save', async function (next) {
  try {
    await metaValidator(this, next);
    next();
  } catch (e) {
    /* istanbul ignore next */
    return next(e);
  }
});

Invite.schema.pre('save', async function (next) {
  try {
    if (this.isNew && this.preview) {
      const survey = await Survey.model
        .findOne({ _id: this.survey })
        .select('surveyType')
        .lean();

      if (survey.surveyType === 'pulse') {
        const surveySections = await loadPreviewSurveySections(survey._id, true);

        const surveyItemsIds = surveySections.reduce((acc, section) => [
          ...acc,
          ...section.surveyItems.map(i => i._id)
        ], []);

        _.sampleSize(surveyItemsIds, 5).forEach(item => _.set(this, `surveyItemsMap.${item}`, true));

        this.markModified('surveyItemsMap');
      }
    }

    next();
  } catch (e) {
    return next(e);
  }
});

// add tags related to this contact
Invite.schema.pre('save', async function (next) {
  try {
    if (this.isNew && this.contact) {
      const tagEntities = await TagEntity.model
        .find({ contact: this.contact })
        .select('tag')
        .lean();

      if (tagEntities.length) {
        this.tags = tagEntities.map(i => i.tag);
      }
    }

    next();
  } catch (e) {
    return next(e);
  }
});

// check if invite is expired
Invite.schema.virtual('isExpired').get(function () {
  // return if ttl is not present
  if (!this.ttl) return false;

  return moment(this.createdAt).add(this.ttl) < moment();
});

// TODO: Process recurring surveys
/**
 * Registration
 */
Invite.defaultColumns = 'company team contact survey createdAt';
Invite.register();

export default Invite;
