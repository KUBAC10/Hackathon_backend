import keystone from 'keystone';

const Types = keystone.Field.Types;

export const widgetRangeTypes = [
  'overall', // default
  'range',
  'lastDay',
  'lastWeek',
  'lastMonths',
  'lastThreeMonths',
  'lastYear'
];


// TODO rework types (and update)
// widget settings keys: [
//   size,
//   chart,
//   dynamics,
//   list,
//   completion,
//   response,
//   overallEngagementScore,
//   topFive,
//   withSubDrivers
// ]
//
// TYPES
//
// customerCentricity
//
// employeeCentricity
//
// TYPES + SETTINGS
//
// ResponseDynamics [
//   { chart },
//     { dynamics },
//   ]
//
// nps [
//   { chart },
//     { dynamics },
//     { list },
//     { chart, dynamics },
//     { chart, dynamics, list }
//   ]
//
// ces / csat [
//   { chart },
//     { dynamics },
//     { chart, dynamics },
//     { chart, dynamics, list }
//   ]
//
// rate [
//   { completion },
//     { response },
//     { response, dynamics }, => https://www.figma.com/file/iyVdYhuRDlamS6oCxhK3jN/Screver---app-(2)?node-id=5145%3A78768
// { completion, response },
// { completion, response, dynamics },
// { completion, response, overallEngagementScore },
// ]
//
// pulse [
//   { chart },
//     { list },
//     { overallEngagementScore },
//   ]
//
// drivers [
//   { topFive },
//     { withSubDrivers },
//   ]
//
// trendQuestion: [
//   { chart },
//   { dynamics },
//   { chart, dynamics },
//   { overallEngagementScore }
// ]
//
// devices: [
//   { size: 2 },
//   { size: 3 },
// ]
//
// location: [
//   { size: 2 },
//   { size: 3 }
// ]

export const widgetTypes = [
  'customerCentricity',
  'employeeCentricity',
  'responseDynamics',
  'nps',
  'ces',
  'csat',
  'rate',
  'pulse',
  'drivers',
  'trendQuestion',
  'devices',
  'location'
];

// export const widgetTypes = [
//   // TODO Centricity rename ?
//   'customerCentricity',
//   'employeeCentricity',
//   // Net Promoter Score Question
//   'npsSmall',
//   'npsMiddle',
//   'npsBig',
//   'npsComments',
//   'npsDynamics',
//   // Survey Responses
//   'responses',
//   'completion',
//   'responsesSmall',
//   'responsesMiddle',
//   'responsesBig',
//   'responsesDynamics',
//   // Drivers
//   'driver',
//   'multipleDrivers',
//   'topFiveDrivers',
//   'allDrivers',
//   'overallDrivers',
//   // Trend Question
//   'questionAverage',
//   'questionDynamics',
//   'questionSmall',
//   'questionBig',
//   // Metrics
//   'metricsAverage',
//   'metricsDynamics',
//   'metricsMiddle',
//   'metricsBig',
//   // Devices
//   'devices',
//   'devicesBig',
//   // Location
//   'location',
//   'locationBig'
// ];

// TODO remove old dashboard and rename to DashboardItem
/**
 * Widget Model
 * ===========
 */

const Widget = new keystone.List('Widget', {
  track: true,
  defaultSort: '-createdAt'
});

Widget.add({
  // relationships
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
  dashboard: {
    type: Types.Relationship,
    ref: 'Dashboard',
    initial: true,
    required: true
  },
  // customization
  name: {
    type: String,
    initial: true
  },
  color: {
    type: String
  },
  type: {
    type: Types.Select,
    options: widgetTypes,
    initial: true,
    required: true
  },
  sortableId: {
    type: Number,
    default: 0
  },
  // filters
  rangeType: {
    type: Types.Select,
    options: widgetRangeTypes,
    default: 'overall'
  },
  from: {
    type: Types.Date
  },
  to: {
    type: Types.Date
  },
  surveys: {
    type: Types.Relationship,
    ref: 'Survey',
    many: true
  },
  questions: {
    type: Types.Relationship,
    ref: 'Question',
    many: true
  },
  surveyCampaigns: {
    type: Types.Relationship,
    ref: 'SurveyCampaign',
    many: true
  },
  contacts: {
    type: Types.Relationship,
    ref: 'Contact',
    many: true
  },
  tags: {
    type: Types.Relationship,
    ref: 'Tag',
    many: true
  },
  languages: {
    type: Types.TextArray,
  },
  countries: {
    type: Types.TextArray
  },
  size: {
    type: Number
  },
  chart: {
    type: Boolean
  },
  dynamics: {
    type: Boolean
  },
  lists: {
    type: Boolean
  },
  completion: {
    type: Boolean
  },
  response: {
    type: Boolean
  },
  overallEngagementScore: {
    type: Boolean
  },
  topFive: {
    type: Boolean
  },
  withSubDrivers: {
    type: Boolean
  }
});

// return widget range
Widget.schema.methods.getRange = function () {
  // switch (this.rangeType) {
  //
  // }
};

// return filters for data
Widget.schema.methods.getQuery = async function () {
  // try {
  //
  // } catch (e) {
  //   return Promise.reject(e);
  // }
};

// return data by widget settings
Widget.schema.methods.getData = async function () {
  try {
    // const query = {};

    // TODO apply filters and range on query
    // surveys
    // range
    // surveyCampaigns
    // tags

    // TODO get loader by widget type

    // TODO load data for widget

    // return data
    // return {};
  } catch (e) {
    return Promise.reject(e);
  }
};

/**
 * Registration
 */
Widget.defaultColumns = 'name company team';
Widget.register();

export default Widget;
