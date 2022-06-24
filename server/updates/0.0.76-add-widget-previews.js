import faker from 'faker';

// models
import {
  WidgetCategory,
  WidgetPreview
} from '../models';

// TODO rework
export default async function addWidgetPreviews(done) {
  try {
    // create widget categories
    const suggestions = new WidgetCategory.model({
      name: 'Suggestions',
      description: faker.lorem.sentence()
    });

    const employeeExperience = new WidgetCategory.model({
      name: 'Employee experience',
      description: faker.lorem.sentence()
    });

    const customerExperience = new WidgetCategory.model({
      name: 'Customer experience',
      description: faker.lorem.sentence()
    });

    const responseDynamics = new WidgetCategory.model({
      name: 'Response dynamicsRate',
      description: faker.lorem.sentence(),
      type: 'chartsByType'
    });

    const rate = new WidgetCategory.model({
      name: 'Rate',
      description: faker.lorem.sentence(),
      type: 'chartsByType'
    });

    const metrics = new WidgetCategory.model({
      name: 'Metrics',
      description: faker.lorem.sentence(),
      type: 'chartsByType'
    });

    const pulseReport = new WidgetCategory.model({
      name: 'Pulse Report',
      description: faker.lorem.sentence(),
      type: 'chartsByType'
    });

    const trendQuestion = new WidgetCategory.model({
      name: 'Trend Question',
      description: faker.lorem.sentence(),
      type: 'chartsByType'
    });

    const comments = new WidgetCategory.model({
      name: 'Comments',
      description: faker.lorem.sentence(),
      type: 'chartsByType'
    });

    const location = new WidgetCategory.model({
      name: 'Location',
      description: faker.lorem.sentence(),
      type: 'chartsByType'
    });

    const devices = new WidgetCategory.model({
      name: 'Devices',
      description: faker.lorem.sentence(),
      type: 'chartsByType'
    });

    // save widget categories
    await Promise.all([
      suggestions.save(),
      employeeExperience.save(),
      customerExperience.save(),
      responseDynamics.save(),
      rate.save(),
      metrics.save(),
      pulseReport.save(),
      trendQuestion.save(),
      comments.save(),
      location.save(),
      devices.save()
    ]);

    //  create widget previews
    const customerCentricity = new WidgetPreview.model({
      name: 'Customer centricity',
      description: faker.lorem.sentence(),
      widgetCategory: [],
      type: 'customerCentricity'
    });

    const employeeCentricity = new WidgetPreview.model({
      name: 'Employee centricity',
      description: faker.lorem.sentence(),
      widgetCategory: [],
      type: 'employeeCentricity'
    });

    // parents (sub categories)
    const nps = new WidgetPreview.model({
      name: 'Nps',
      description: faker.lorem.sentence(),
      widgetCategory: [metrics._id]
    });

    const ces = new WidgetPreview.model({
      name: 'CES (Customer effort score)',
      description: faker.lorem.sentence(),
      widgetCategory: [metrics._id]
    });

    const csat = new WidgetPreview.model({
      name: 'CSAT ?',
      description: faker.lorem.sentence(),
      widgetCategory: [metrics._id]
    });

    await Promise.all([
      nps.save(),
      ces.save(),
      csat.save()
    ]);

    // NPS child
    const npsAvgValue = new WidgetPreview.model({
      name: 'NPS / Avg. value',
      description: faker.lorem.sentence(),
      parent: nps._id,
      type: 'nps',
      chart: true
    });

    const npsResponseDynamic = new WidgetPreview.model({
      name: 'NPS / Response dynamics',
      description: faker.lorem.sentence(),
      parent: nps._id,
      type: 'nps',
      dynamics: true
    });

    const npsComments = new WidgetPreview.model({
      name: 'NPS / Comments',
      description: faker.lorem.sentence(),
      parent: nps._id,
      type: 'nps',
      lists: true
    });

    const npsAvgValueResponseDynamic = new WidgetPreview.model({
      name: 'NPS / Avg. value + response dynamics',
      description: faker.lorem.sentence(),
      parent: nps._id,
      type: 'nps',
      chart: true,
      dynamics: true
    });

    const npsAvgValueChartComments = new WidgetPreview.model({
      name: 'NPS / Avg. value + Chart + Highlighted comments',
      description: faker.lorem.sentence(),
      parent: nps._id,
      type: 'nps',
      chart: true,
      dynamics: true,
      lists: true
    });

    // CES child
    const cesMetricsAvgRateInDynamics = new WidgetPreview.model({
      name: 'Metrics / Avg. Rate + in dynamics ',
      description: faker.lorem.sentence(),
      parent: ces._id,
      type: 'ces',
      chart: true
    });

    const cesMetricsAvgRate = new WidgetPreview.model({
      name: 'Metrics / Avg. Rate',
      description: faker.lorem.sentence(),
      parent: ces._id,
      type: 'ces',
      dynamics: true
    });

    const cesMetricsInDynamics = new WidgetPreview.model({
      name: 'Metrics / in dynamics chart',
      description: faker.lorem.sentence(),
      parent: ces._id,
      type: 'ces',
      chart: true,
      dynamics: true
    });

    const cesMetricsAvgRateChartComments = new WidgetPreview.model({
      name: 'Metrics / Avg. Rate + chart + comments',
      description: faker.lorem.sentence(),
      parent: ces._id,
      type: 'ces',
      chart: true,
      dynamics: true,
      comments: true
    });

    // CSAT child
    const csatMetricsAvgRateInDynamics = new WidgetPreview.model({
      name: 'Metrics / Avg. Rate + in dynamics ',
      description: faker.lorem.sentence(),
      parent: csat._id,
      type: 'csat',
      chart: true
    });

    const csatMetricsAvgRate = new WidgetPreview.model({
      name: 'Metrics / Avg. Rate',
      description: faker.lorem.sentence(),
      parent: csat._id,
      type: 'csat',
      dynamics: true
    });

    const csatMetricsInDynamics = new WidgetPreview.model({
      name: 'Metrics / in dynamics chart',
      description: faker.lorem.sentence(),
      parent: csat._id,
      type: 'csat',
      chart: true,
      dynamics: true
    });

    const csatMetricsAvgRateChartComments = new WidgetPreview.model({
      name: 'Metrics / Avg. Rate + chart + comments',
      description: faker.lorem.sentence(),
      parent: csat._id,
      type: 'csat',
      chart: true,
      dynamics: true,
      comments: true
    });

    // Rate
    const completionRate = new WidgetPreview.model({
      name: 'Rate / Completion rate',
      description: faker.lorem.sentence(),
      widgetCategory: [rate._id],
      type: 'rate',
      completion: true
    });

    const responseRate = new WidgetPreview.model({
      name: 'Rate / Response rate',
      description: faker.lorem.sentence(),
      widgetCategory: [rate._id],
      type: 'rate',
      response: true
    });

    const responseCompleteRate = new WidgetPreview.model({
      name: 'Rate / Response + completaion',
      description: faker.lorem.sentence(),
      widgetCategory: [rate._id],
      type: 'rate',
      completion: true,
      response: true
    });

    const responseCompleteRateInDynamics = new WidgetPreview.model({
      name: 'Rate / Completion + response in dynamics',
      description: faker.lorem.sentence(),
      widgetCategory: [rate._id],
      type: 'rate',
      completion: true,
      response: true,
      dynamics: true
    });

    const completionResponseOverall = new WidgetPreview.model({
      name: 'Rate / Completion + response + overall engagements',
      description: faker.lorem.sentence(),
      widgetCategory: [rate._id],
      type: 'rate',
      completion: true,
      response: true,
      overallEngagementScore: true
    });

    // Pulse report
    const topFivePriority = new WidgetPreview.model({
      name: 'Pulse / Top 5 Priority of improvements',
      description: faker.lorem.sentence(),
      widgetCategory: [pulseReport._id],
      type: 'drivers',
      topFive: true
    });

    const driverWithSubdrivers = new WidgetPreview.model({
      name: 'Pulse / 1 driver with subdrivers',
      description: faker.lorem.sentence(),
      widgetCategory: [pulseReport._id],
      tuype: 'drivers',
      withSubDrivers: true
    });

    const overallEngagementScore = new WidgetPreview.model({
      name: 'Pulse / Overal engagement score',
      description: faker.lorem.sentence(),
      widgetCategory: [pulseReport._id],
      type: 'pulse',
      overallEngagementScore: true
    });

    const allDriversWithScore = new WidgetPreview.model({
      name: 'Pulse / All drivers with score (compress view)',
      description: faker.lorem.sentence(),
      widgetCategory: [pulseReport._id],
      type: 'pulse',
      chart: true
    });

    const selectedDrivers = new WidgetPreview.model({
      name: 'Pulse / Select drivers to show',
      description: faker.lorem.sentence(),
      widgetCategory: [pulseReport._id],
      type: 'pulse',
      lists: true
    });

    // Trend question
    const trendAvgValue = new WidgetPreview.model({
      name: 'Trend question / Avg. value',
      description: faker.lorem.sentence(),
      widgetCategory: [trendQuestion._id],
      type: 'trendQuestion',
      chart: true
    });

    const trendAvgValueResponseDynamics = new WidgetPreview.model({
      name: 'Trend question / Avg. value + response dynamics chart',
      description: faker.lorem.sentence(),
      widgetCategory: [trendQuestion._id],
      type: 'trendQuestion',
      chart: true,
      dynamics: true
    });

    const trendAvgValuePie = new WidgetPreview.model({
      name: 'Trend question / Avg. value pie chart',
      description: faker.lorem.sentence(),
      widgetCategory: [trendQuestion._id],
      type: 'trendQuestion',
      chart: true,
      overallEngagementScore: true
    });

    const trendResponseDynamics = new WidgetPreview.model({
      name: 'Trend question / Response dynamics',
      description: faker.lorem.sentence(),
      widgetCategory: [trendQuestion._id],
      type: 'trendQuestion',
      dynamics: true
    });

    // Devices
    const devicesSmall = new WidgetPreview.model({
      name: 'Devices / Small',
      description: faker.lorem.sentence(),
      widgetCategory: [devices._id],
      type: 'devices',
      size: 2
    });

    const devicesBig = new WidgetPreview.model({
      name: 'Devices / Big',
      description: faker.lorem.sentence(),
      widgetCategory: [devices._id],
      type: 'devices',
      size: 3
    });

    // Location
    const locationMed = new WidgetPreview.model({
      name: 'Location / Med',
      description: faker.lorem.sentence(),
      widgetCategory: [location._id],
      type: 'location',
      size: 2
    });

    const locationBig = new WidgetPreview.model({
      name: 'Location / Big',
      description: faker.lorem.sentence(),
      widgetCategory: [location._id],
      type: 'location',
      size: 3
    });

    // Response dynamics
    const responseDynamicMedium = new WidgetPreview.model({
      name: 'Response dynamic / Medium',
      description: faker.lorem.sentence(),
      widgetCategory: [responseDynamics._id],
      type: 'rate',
      response: true,
      dynamics: true
    });

    // apply images
    await Promise.all([
      // customerCentricity.applyImage('customerCentricity'),
      // employeeCentricity.applyImage('employeeCentricity'),
      npsAvgValue.applyImage('npsAvgValue'),
      npsResponseDynamic.applyImage('npsResponseDynamic'),
      npsComments.applyImage('npsComments'),
      npsAvgValueResponseDynamic.applyImage('npsAvgValueResponseDynamic'),
      npsAvgValueChartComments.applyImage('npsAvgValueChartComments'),
      cesMetricsAvgRateInDynamics.applyImage('cesMetricsAvgRateInDynamics'),
      cesMetricsAvgRate.applyImage('cesMetricsAvgRate'),
      cesMetricsInDynamics.applyImage('cesMetricsInDynamics'),
      cesMetricsAvgRateChartComments.applyImage('cesMetricsAvgRateChartComments'),
      csatMetricsAvgRateInDynamics.applyImage('cesMetricsAvgRateInDynamics'),
      csatMetricsAvgRate.applyImage('cesMetricsAvgRate'),
      csatMetricsInDynamics.applyImage('cesMetricsAvgRateInDynamics'),
      csatMetricsAvgRateChartComments.applyImage('cesMetricsAvgRateChartComments'),
      completionRate.applyImage('completionRate'),
      responseRate.applyImage('responseRate'),
      responseCompleteRate.applyImage('responseCompleteRate'),
      responseCompleteRateInDynamics.applyImage('responseCompleteRateInDynamics'),
      completionResponseOverall.applyImage('completionResponseOverall'),
      topFivePriority.applyImage('topFivePriority'),
      driverWithSubdrivers.applyImage('driverWithSubdrivers'),
      overallEngagementScore.applyImage('overallEngagementScore'),
      allDriversWithScore.applyImage('allDriversWithScore'),
      selectedDrivers.applyImage('selectedDrivers'),
      trendAvgValue.applyImage('trendAvgValue'),
      trendAvgValueResponseDynamics.applyImage('trendAvgValueResponseDynamics'),
      trendAvgValuePie.applyImage('trendAvgValuePie'),
      trendResponseDynamics.applyImage('trendResponseDynamics'),
      devicesSmall.applyImage('devicesSmall'),
      devicesBig.applyImage('devicesBig'),
      locationMed.applyImage('locationMed'),
      locationBig.applyImage('locationBig'),
      responseDynamicMedium.applyImage('responseDynamicMedium')
    ]);
    // save widget previews
    await Promise.all([
      customerCentricity.save(),
      employeeCentricity.save(),
      npsAvgValue.save(),
      npsResponseDynamic.save(),
      npsComments.save(),
      npsAvgValueResponseDynamic.save(),
      npsAvgValueChartComments.save(),
      cesMetricsAvgRateInDynamics.save(),
      cesMetricsAvgRate.save(),
      cesMetricsInDynamics.save(),
      cesMetricsAvgRateChartComments.save(),
      csatMetricsAvgRateInDynamics.save(),
      csatMetricsAvgRate.save(),
      csatMetricsInDynamics.save(),
      csatMetricsAvgRateChartComments.save(),
      completionRate.save(),
      responseRate.save(),
      responseCompleteRate.save(),
      responseCompleteRateInDynamics.save(),
      completionResponseOverall.save(),
      topFivePriority.save(),
      driverWithSubdrivers.save(),
      overallEngagementScore.save(),
      allDriversWithScore.save(),
      selectedDrivers.save(),
      trendAvgValue.save(),
      trendAvgValueResponseDynamics.save(),
      trendAvgValuePie.save(),
      trendResponseDynamics.save(),
      devicesSmall.save(),
      devicesBig.save(),
      locationMed.save(),
      locationBig.save(),
      responseDynamicMedium.save()
    ]);

    done();
  } catch (e) {
    console.error('Updates error: add widget previews');
    console.error(e);
    done(e);
  }
}
