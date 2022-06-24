import keystone from 'keystone';

const Types = keystone.Field.Types;

/**
 * FutureRequest Model
 * ===========
 */

const FutureRequest = new keystone.List('FutureRequest', {
  track: true,
  defaultSort: '-createdAt'
});

FutureRequest.add({
  count: {
    type: Types.Number,
    initial: true,
    required: true
  },
  company: {
    type: Types.Relationship,
    ref: 'Company',
    initial: true,
    required: true
  },
  approved: {
    type: Boolean,
    default: false
  },
  approvedAt: {
    type: Types.Date,
    default: undefined
  }
});

// increment sms limit on company
FutureRequest.schema.pre('save', async function (next) {
  try {
    if (!this.isNew && this.approved && !this.approvedAt) {
      const { company, count } = this;

      await keystone.lists.Company.model
        .update({ _id: company }, { $inc: { smsLimit: count } });

      this.approvedAt = new Date();
    }
  } catch (e) {
    return next(e);
  }
});

/**
 * Registration
 */
FutureRequest.register();

export default FutureRequest;
