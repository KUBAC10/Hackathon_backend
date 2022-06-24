import keystone from 'keystone';

const Types = keystone.Field.Types;

/**
 * Dashboard Model
 * ===========
 */

const Dashboard = new keystone.List('Dashboard', {
  track: true,
  defaultSort: '-createdAt'
});

Dashboard.add({
  name: {
    type: String,
    initial: true
  },
  description: {
    type: String
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
  }
});

Dashboard.schema.virtual('widgets', {
  ref: 'Widget',
  localField: '_id',
  foreignField: 'dashboard',
  options: {
    sort: { sortableId: 1 },
  }
});

// remove related widgets
Dashboard.schema.pre('remove', async function (next) {
  try {
    const { Widget } = keystone.lists;

    await Widget.model.deleteMany({ dashboard: this._id });

    next();
  } catch (e) {
    return next(e);
  }
});

/**
 * Registration
 */
Dashboard.defaultColumns = 'name company team';
Dashboard.register();

export default Dashboard;
