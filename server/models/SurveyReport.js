import { promises as fs } from 'fs';
import keystone from 'keystone';
import moment from 'moment';
import async from 'async';
import _ from 'lodash';
import csv from 'csv';

// models
import {
  Survey,
  SurveyReportItem,
  SurveyItem,
  Country
} from '../models';

// config
import { localizationList } from '../../config/localization';

// services
import CloudinaryUploader from '../services/CloudinaryUploader';

// helpers
import { checkLimit, handleLimit } from '../helpers/limitation';
import { loadSurveyDoc } from '../controllers/helpers';
import SurveyCampaign from './SurveyCampaign';
import buildQuery from '../services/segments/helpers/buildQuery';
import SurveyResult from './SurveyResult';
import loadSurveyItemsForReport from '../controllers/helpers/loadSurveyItemsForReport';
import parseTpl from '../helpers/parse-es6-template';

const Types = keystone.Field.Types;

export const rangeOptions = [
  'summary',
  'today',
  'yesterday',
  'lastSevenDays',
  'lastThirtyDays',
  'thisMonth',
  'before',
  'after',
  'custom'
];

const colors = [
  '#2565EF',
  '#5F2CEF',
  '#F33B67',
  '#EE4339',
  '#FDB220',
  '#7CD866',
  '#33ACF0',
  '#4781F2'
];

/**
 * SurveyReport Model
 * ===========
 */

const SurveyReport = new keystone.List('SurveyReport', {
  track: true,
  defaultSort: '-createdAt'
});

SurveyReport.add({
  name: {
    type: String,
    required: true,
    default: 'Survey Report'
  },
  description: {
    type: String
  },
  lang: {
    type: Types.Select,
    options: localizationList
  },
  logo: {
    type: Types.CloudinaryImage,
    autoCleanup: true,
    folder(item) {
      /* istanbul ignore next */
      return `${item.company}/report-logo/${item._id}`;
    },
    note: 'For report logo'
  },
  cover: {
    type: Types.CloudinaryImage,
    autoCleanup: true,
    folder(item) {
      /* istanbul ignore next */
      return `${item.company}/report-cover/${item._id}`;
    },
    note: 'For report cover'
  },
  colors: {
    type: Types.TextArray,
    default: colors,
    required: true
  },
  survey: {
    type: Types.Relationship,
    ref: 'Survey',
    initial: true,
    required: true
  },
  company: {
    type: Types.Relationship,
    ref: 'Company',
    initial: true,
    required: true
  },
  team: {
    type: Types.Relationship,
    ref: 'Team',
    initial: true,
    required: true
  },
  default: {
    type: Boolean
  },
  hideCoverPage: {
    type: Boolean,
  },
  hideLastPage: {
    type: Boolean,
  },
  titleLastPage: {
    type: String,
    required: true,
    default: 'Thank you!'
  },
  textLastPage: {
    type: String
  },
  targets: {
    type: Types.Relationship,
    ref: 'Target',
    many: true
  },
  tags: {
    type: Types.Relationship,
    ref: 'Tag',
    many: true
  },

  // mail reports
  reportsMailing: {
    type: Boolean
  },
  emailReportFormat: {
    emailTable: {
      type: Boolean
    },
    csv: {
      type: Boolean
    },
    pdf: {
      type: Boolean
    }
  },
  groupBySurveyItem: {
    type: Types.Relationship,
    ref: 'SurveyItem'
  },

  // report settings
  range: {
    type: Types.Select,
    options: rangeOptions,
    default: 'summary',
    required: true
  },
  from: {
    type: Types.Date
  },
  to: {
    type: Types.Date
  },
  drivers: {
    type: Types.Relationship,
    ref: 'PulseSurveyDriver',
    many: true
  }
});

// segments settings
SurveyReport.schema.add({ segments: { type: Object } });

SurveyReport.schema.virtual('surveyReportItems', {
  ref: 'SurveyReportItem',
  localField: '_id',
  foreignField: 'surveyReport'
});

SurveyReport.schema.virtual('surveyCampaign', {
  ref: 'SurveyCampaign',
  localField: '_id',
  foreignField: 'surveyReport',
  many: false
});

SurveyReport.schema.post('init', function () {
  const oldThis = this.toObject();

  this._oldLogo = oldThis.logo;
  this._oldCover = oldThis.cover;
});

// check company limit
SurveyReport.schema.pre('save', async function (next) {
  try {
    if (this.isNew) await checkLimit(this);
  } catch (e) {
    return next(e);
  }
});

// hide survey items in big surveys
SurveyReport.schema.pre('save', async function (next) {
  try {
    if (this.isNew) {
      // find all survey items
      const surveyItems = await SurveyItem.model
        .find({ survey: this.survey, inTrash: { $ne: true } })
        .select('_id')
        .lean();

      if (surveyItems.length > 30) {
        const survey = await loadSurveyDoc({ _id: this.survey });

        const { surveySections = [] } = survey;

        const surveyItems = surveySections
          .reduce((acc, { surveyItems = [] }) => ([...acc, ...surveyItems]), [])
          .slice(30);

        for (const surveyItem of surveyItems) {
          // create surveyReportItems and set hide status
          await SurveyReportItem.model
            .updateOne({
              surveyReport: this._id,
              surveyItem: surveyItem._id,
              company: this.company,
              type: 'surveyReport'
            }, {
              $set: { hide: true }
            }, {
              upsert: true
            });
        }
      }
    }

    next();
  } catch (e) {
    return next(e);
  }
});

// reports mailing
// create default survey campaign
SurveyReport.schema.pre('save', async function (next) {
  try {
    if (this.isNew && this.reportsMailing) {
      const {
        company,
        survey,
        team,
      } = this;

      const surveyCampaign = new SurveyCampaign.model({
        company,
        survey,
        team,
        reportsMailing: true,
        surveyReport: this._id
      });

      await surveyCampaign.save();
    }

    next();
  } catch (e) {
    return next(e);
  }
});

// handle images
SurveyReport.schema.pre('save', async function(next) {
  try {
    await Promise.all([
      this.handleCloudinary('logo'),
      this.handleCloudinary('cover')
    ]);

    next();
  } catch (e) {
    return next(e);
  }
});

// handle company limit
SurveyReport.schema.post('save', async function (next) {
  try {
    if (this._limit) await handleLimit(this._limit);
  } catch (e) {
    return next(e);
  }
});

// remove related entities
SurveyReport.schema.pre('remove', async function (next) {
  try {
    await SurveyReportItem.model.remove({ surveyReport: this._id });
    await SurveyReport.model.remove({ surveyReport: this._id });

    next();
  } catch (e) {
    return next(e);
  }
});

// remove images
SurveyReport.schema.pre('remove', async function (next) {
  try {
    await Promise.all([
      this.handleCloudinary('logo', true),
      this.handleCloudinary('cover', true)
    ]);

    next();
  } catch (e) {
    return next(e);
  }
});

/**
 * Methods
 * ===================
 */

// clone survey report
SurveyReport.schema.methods.getClone = async function (session) {
  try {
    const clone = new SurveyReport.model(_.omit(this.toObject(), ['_id', 'default']));

    // close survey report items
    const items = await SurveyReportItem.model.find({ surveyReport: this._id });

    // TODO clone logo and cover
    await async.eachLimit(items, 5, (item, cb) => {
      item.surveyReport = clone._id;
      item.getClone(session)
        .then(() => cb())
        .catch(cb);
    });

    await clone.save({ session });

    return clone._id;
  } catch (e) {
    return Promise.reject(e);
  }
};

// update image
SurveyReport.schema.methods.handleCloudinary = async function (key, clear = false) {
  try {
    const underscoreKey = `_${key}`;
    const oldKey = `_old${_.capitalize(key)}`;

    if (_.isString(this[underscoreKey])) {
      this[key] = await CloudinaryUploader
        .uploadImage({
          company: this.company,
          encodedFile: this[underscoreKey],
          entity: this,
          actionName: `report${_.capitalize(key)}`
        });

      const oldPublic_id = _.get(this, `${oldKey}.public_id`);

      if (oldPublic_id) await CloudinaryUploader.cleanUp({ public_id: oldPublic_id });

      _.unset(this, oldKey);
      _.unset(this, underscoreKey);
    }

    // remove avatar
    if (this[underscoreKey] === null) {
      const public_id = _.get(this, `${key}.public_id`);

      if (public_id) await CloudinaryUploader.cleanUp({ public_id });

      this[key] = null;
    }

    if (clear) {
      const public_id = _.get(this, `${key}.public_id`);

      if (public_id) await CloudinaryUploader.cleanUp({ public_id });
    }
  } catch (e) {
    return Promise.reject(e);
  }
};

// get range
SurveyReport.schema.methods.getRange = function () {
  const { range, from, to } = this;

  switch (range) {
    case 'today':
      return {
        from: moment().startOf('day'),
        to: moment().endOf('day'),
      };
    case 'yesterday':
      return {
        from: moment().subtract(1, 'day').startOf('day'),
        to: moment().subtract(1, 'day').endOf('day'),
      };
    case 'lastSevenDays':
      return {
        from: moment().subtract(7, 'day').startOf('day'),
        to: moment().endOf('day'),
      };
    case 'lastThirtyDays':
      return {
        from: moment().subtract(30, 'day').startOf('day'),
        to: moment().endOf('day'),
      };
    case 'thisMonth':
      return {
        from: moment().startOf('month'),
        to: moment().endOf('month'),
      };
    case 'before':
      return {
        to: moment(to).endOf('day')
      };
    case 'after':
      return {
        from: moment(from).endOf('day')
      };
    case 'custom':
      return {
        from: moment(from).startOf('day'),
        to: moment(to).endOf('day')
      };
    default:
      return;
  }
};

// get auto reports data
SurveyReport.schema.methods.getAutoReportData = async function (options = {}) {
  try {
    const { from, to } = options;
    const { tags, targets, segments, groupBySurveyItem } = this;
    const lang = 'en'; // TODO get language

    const survey = await Survey.model
      .findOne({ _id: this.survey })
      .lean();

    // create query and apply filters
    const query = buildQuery({
      ...segments,
      survey: survey._id,
      skipFilter: true,
      range: { from, to }
    });

    if (targets && targets.length) query.target = { $in: targets };

    if (tags && tags.length) query.tags = { $in: tags };

    let filters = ''; // table data
    let attachments = [];
    // let pdf;

    const names = {};
    const types = {};

    // load survey results
    const surveyResults = await SurveyResult.model
      .find(query)
      .populate('tags contact')
      .sort({ createdAt: -1 })
      .lean();

    if (!surveyResults.length) return { filters: 'No new results have been received in the specified period of time.' };

    // load countries
    const countries = await Country.model
      .find()
      .select('_id name')
      .lean();

    // load all survey items for report
    let surveyItems = await loadSurveyItemsForReport(survey._id);

    // filter question survey items
    surveyItems = surveyItems.filter(i => ['question', 'trendQuestion'].includes(i.type));

    // load report items
    const reportItems = await SurveyReportItem.model.find({ surveyReport: this._id, hide: true });

    // filter hidden in report questions
    if (reportItems.length) {
      const excludeItems = reportItems.map(i => i.surveyItem.toString());

      surveyItems = surveyItems.filter(i => !excludeItems.includes(i._id.toString()));
    }

    surveyItems.forEach((item) => {
      const { question = {} } = item;
      const { questionItems = [], gridRows = [], gridColumns = [] } = question;

      // set question type by surveyItem id
      types[item._id] = question.type;
      names[item._id] = _.get(question, `name.${lang}`);

      // set item names by ids
      [
        ...questionItems,
        ...gridRows,
        ...gridColumns
      ].forEach((i) => {
        names[i._id] = _.get(i, `name.${lang}`);
      });
    });

    countries.forEach((country) => {
      names[country._id] = country.name;
    });

    const groupedData = await _parseSurveyResults({
      groupBySurveyItem,
      surveyResults,
      surveyReport: this._id,
      survey: this.survey,
      lang,
      surveyItems,
      names,
      types
    });

    // TODO parse survey results to email table format
    if (this.emailReportFormat.emailTable) {
      filters = await _parseSurveyResultsToTable({
        surveyResults,
        groupedData,
        names,
        lang
      });
    }

    // parse survey results to csv file attachments
    if (this.emailReportFormat.csv) {
      attachments = await _surveyResultsToCsv({
        surveyResults,
        groupedData,
        surveyItems,
        survey,
        names,
        lang
      });
    }

    // TODO parse survey results to pdf file
    // if (this.emailReportFormat.pdf) {
    //
    // }

    return { filters, attachments };
  } catch (e) {
    return Promise.reject(e);
  }
};

// handle survey answers to string view for mailer report
async function _parseSurveyResults(options = {}) {
  try {
    const { surveyResults, groupBySurveyItem, surveyItems = [], names = {}, types = {} } = options;

    // parse survey results
    surveyResults.forEach((result) => {
      const { answer = {}, createdAt } = result;

      result.date = moment(createdAt).format('DD.MM.YYYY');

      Object.keys(answer).forEach((key) => {
        if (types[key]) {
          const questionName = names[key];
          const answerString = _answerToString(answer[key], names);

          _.set(result, `parsedAnswer.${key}.questionName`, questionName);
          _.set(result, `parsedAnswer.${key}.answerString`, answerString);
        }
      });
    });

    // group results by surveyItem answer
    if (groupBySurveyItem) {
      const surveyItem = surveyItems.find(i => i._id.toString() === groupBySurveyItem.toString());

      if (surveyItem) {
        const questionType = _.get(surveyItem, 'question.type');

        let groupItems = [];

        if (questionType === 'thumbs') {
          groupItems = ['yes', 'no'];
        }

        if (questionType === 'linearScale') {
          const from = _.get(surveyItem, 'question.linearScale.from');
          const to = _.get(surveyItem, 'question.linearScale.to') + 1;

          groupItems = _.range(from, to);
        }

        if (questionType === 'netPromoterScore') {
          groupItems = _.range(0, 11);
        }

        if (['multipleChoice', 'dropdown', 'checkboxes', 'imageChoice'].includes(questionType)) {
          groupItems = _.get(surveyItem, 'question.questionItems', []).map(i => i._id);
        }

        if (groupItems.length) {
          const groupedData = { surveyItem };

          groupItems.forEach((item) => {
            const filteredResults = surveyResults.filter((result) => {
              if (['linearScale', 'netPromoterScore', 'thumbs'].includes(questionType)) {
                const value = _.get(result, `answer.${surveyItem._id}.value`);

                return value !== undefined && value.toString() === item.toString();
              }

              if (['multipleChoice', 'dropdown', 'checkboxes', 'imageChoice'].includes(questionType)) {
                const questionItems = _.get(result, `answer.${surveyItem._id}.questionItems`, []);

                return questionItems.length && questionItems.includes(item._id.toString());
              }

              return false;
            });

            if (filteredResults.length) groupedData[item] = filteredResults;
          });

          return groupedData;
        }
      }
    }
  } catch (e) {
    return Promise.reject(e);
  }
}

// parse survey result answer to string format
function _answerToString(answer, names) {
  const { questionItems = [], crossings, country, value, customAnswer } = answer;

  let answerString = '';

  // handle question items questions
  if (questionItems && questionItems.length) {
    questionItems.forEach((i) => {
      answerString = `${answerString} ${names[i]},`;
    });

    // TODO use lodash?
    answerString = answerString.substring(1, answerString.length - 1);
  }

  if (crossings && crossings.length) {
    crossings.forEach((i) => {
      answerString = `${answerString} ${names[i.gridRow]} - ${names[i.gridColumn]},`;
    });

    // TODO use lodash?
    answerString = answerString.substring(1, answerString.length - 1);
  }

  if (country) answerString = names[country];

  if (value !== undefined) answerString = value;

  if (customAnswer !== undefined) answerString = `${answerString}, ${customAnswer}`;

  return answerString;
}

async function _parseSurveyResultsToTable(options = {}) {
  try {
    const { surveyResults = [], groupedData, names, lang } = options;

    const [
      filterHtml,
      sectionHtml,
      questionHtml,
      responseDateHtml
    ] = await Promise.all([
      fs.readFile('server/mailers/autoReportsMailer/Filter.html', 'utf-8'),
      fs.readFile('server/mailers/autoReportsMailer/Section.html', 'utf-8'),
      fs.readFile('server/mailers/autoReportsMailer/Question.html', 'utf-8'),
      fs.readFile('server/mailers/autoReportsMailer/ResponseDate.html', 'utf-8')
    ]);

    // handle grouped data
    if (groupedData) {
      const filters = [];

      const question = _.get(groupedData, 'surveyItem.question', {});

      delete groupedData.surveyItem;

      const amountOfItems = Object.keys(groupedData).length;
      const resultsPerGroup = parseInt((50 / amountOfItems), 10);

      Object.keys(groupedData).forEach((key) => {
        const sections = [];

        _surveyResultsToTable({
          sections,
          sectionHtml,
          questionHtml,
          responseDateHtml,
          surveyResults: groupedData[key].slice(0, resultsPerGroup)
        });

        let filterName = key;

        if (['multipleChoice', 'dropdown', 'checkboxes', 'imageChoice'].includes(question.type)) {
          filterName = names[key];
        }

        if (question.type === 'thumbs') {
          if (key === 'yes') filterName = _.get(question, `linearScale.fromCaption.${lang}`, 'yes');
          if (key === 'no') filterName = _.get(question, `linearScale.toCaption.${lang}`, 'no');
        }

        const parsedFilter = parseTpl(filterHtml, { sections: sections.join('\n'), filterName }, '');

        filters.push(parsedFilter);
      });

      return filters.join('\n');
    }

    if (surveyResults.length) {
      const sections = [];

      _surveyResultsToTable({
        sections,
        surveyResults: surveyResults.slice(0, 50),
        sectionHtml,
        questionHtml,
        responseDateHtml
      });

      const parsedFilter = parseTpl(filterHtml, { sections: sections.join('\n') }, '');

      return parsedFilter;
    }
  } catch (e) {
    return Promise.reject(e);
  }
}

// parse survey results to csv files
async function _surveyResultsToCsv(options = {}) {
  try {
    const { survey, surveyResults = [], groupedData, surveyItems = [], names = {} } = options;

    // create columns
    const columns = [
      'ID',
      'Started At (UTC)',
      'Contact',
      'Tags'
    ];

    if (survey.scoring) columns.push('Score');

    // add question names
    surveyItems.forEach((item) => {
      columns.push(names[item._id]);
    });

    // return bunch of files (attachments)
    if (groupedData) {
      const promises = [];

      Object.keys(groupedData).forEach((key) => {
        if (key !== 'surveyItem') {
          promises.push(_csvStringifyPromise({
            surveyResults: groupedData[key],
            surveyItems,
            survey,
            columns,
            filename: `${_.camelCase(names[key] || key)}.csv`
          }));
        }
      });

      const attachments = await Promise.all(promises);

      return attachments;
    }

    if (surveyResults.length) {
      const attachment = await _csvStringifyPromise({
        surveyResults,
        surveyItems,
        survey,
        columns
      });

      return [attachment];
    }
  } catch (e) {
    return Promise.reject(e);
  }
}

// fill email table with survey results
function _surveyResultsToTable(options = {}) {
  const {
    sections = [],
    surveyResults = [],
    sectionHtml,
    questionHtml,
    responseDateHtml
  } = options;

  let count = 1;

  surveyResults.forEach((result) => {
    const { parsedAnswer = {} } = result;

    const sectionName = `#${count}`;
    const formattedResponseDate = result.createdAt && moment.utc(result.createdAt).format('DD.MM.YYYY HH:mm');
    const questions = [];

    const sectionResponseDate = parseTpl(responseDateHtml, { responseDate: formattedResponseDate }, '');

    Object.keys(parsedAnswer).forEach((key) => {
      const questionName = parsedAnswer[key].questionName;
      const answer = parsedAnswer[key].answerString;

      const parsedQuestion = parseTpl(questionHtml, { questionName, answer }, '');

      questions.push(parsedQuestion);
    });

    const parsedSection = parseTpl(sectionHtml, {
      sectionName,
      sectionResponseDate,
      questions: questions.join('\n')
    }, '');

    sections.push(parsedSection);

    count += 1;
  });
}

function _csvStringifyPromise(options = {}) {
  const { surveyResults, surveyItems, survey, columns, filename = 'surveyResults.csv' } = options;
  const rows = [];

  surveyResults.forEach((result) => {
    const row = [];

    row.push(result._id);
    row.push(moment.utc(result.createdAt).format('DD/MM/YYYY HH:mm'));
    row.push(result.contact ? result.contact.name : result.fingerprintId);
    row.push((result.tags || []).map(i => i.name));

    if (survey.scoring) row.push(result.scorePoints);

    surveyItems.forEach((item) => {
      row.push(_.get(result, `parsedAnswer.${item._id}.answerString`, ''));
    });

    rows.push(row);
  });


  return new Promise((resolve, reject) => {
    csv.stringify(rows, { columns, header: true }, (err, output) => {
      if (err) return reject(err);

      return resolve({ filename, content: output });
    });
  });
}

/**
 * Registration
 */
SurveyReport.defaultColumns = 'survey company';
SurveyReport.register();

export default SurveyReport;
