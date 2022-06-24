import uuid from 'uuid';
import keystone from 'keystone';

const Types = keystone.Field.Types;

/**
 * Target Model
 * ===========
 */

const Target = new keystone.List('Target', {
  track: true,
  defaultSort: '-createdAt'
});

Target.add({
  name: {
    type: String,
    initial: true,
    required: true
  },
  team: {
    type: Types.Relationship,
    ref: 'Team',
    initial: true,
    required: true
  },
  company: {
    type: Types.Relationship,
    ref: 'Company',
    initial: true,
    required: true
  },
  survey: {
    type: Types.Relationship,
    ref: 'Survey',
    initial: true,
    required: true
  },
  token: {
    type: String,
    required: true,
    default: uuid
  }
});

Target.schema.virtual('surveyCampaigns', {
  ref: 'SurveyCampaign',
  localField: '_id',
  foreignField: 'target',
  options: {
    sort: { createdAt: 1 },
  }
});

// remove all related survey campaigns
Target.schema.pre('remove', async function (next) {
  try {
    const { SurveyCampaign } = keystone.lists;

    const campaigns = await SurveyCampaign.model.find({ target: this._id });

    for (const campaign of campaigns) {
      await campaign.remove();
    }

    next();
  } catch (e) {
    /* istanbul ignore next */
    return next(e);
  }
});

/**
 * Registration
 */
Target.defaultColumns = 'name';
Target.register();

export default Target;
