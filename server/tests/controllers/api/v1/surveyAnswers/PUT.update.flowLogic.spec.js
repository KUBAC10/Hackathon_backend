import _ from 'lodash';
import async from 'async';
import request from 'supertest';
import httpStatus from 'http-status';
import chai, { expect } from 'chai';
import app from 'index';

// models
import {
  FlowLogic,
  SurveyResult
} from '../../../../../models';

// factories
import {
  contentFactory,
  countryFactory,
  flowItemFactory,
  flowLogicFactory,
  gridRowFactory,
  gridColumnFactory,
  questionFactory,
  questionItemFactory,
  surveyFactory,
  surveyItemFactory,
  surveyResultFactory,
  surveySectionFactory,
  teamFactory
} from '../../../../factories';

// helpers
import cleanData from '../../../../testHelpers/cleanData';

// services
import { APIMessagesExtractor } from '../../../../../services';

chai.config.includeStack = true;

const questionTypes = [
  'countryList',
  'text',
  'multipleChoice',
  'checkboxes',
  'dropdown',
  'linearScale',
  'thumbs',
  'netPromoterScore',
  'slider',
  'multipleChoiceMatrix',
  'checkboxMatrix'
];
const fieldConditions = ['empty', 'notEmpty'];
const itemConditions = ['selected', 'notSelected'];
const textConditions = ['equal', 'notEqual', 'contains', 'notContains', 'matchRegExp', 'beginsWith', 'endsWith'];
const logicConditions = ['greater', 'greaterEqual', 'less', 'lessEqual', 'equal', 'notEqual'];

let company;
let team;
let surveyId;
let completeMessage;

const flowLogicDocs = {};
const surveyItems = {};
const questions = {};
const answers = {};

function _getConditions(type) {
  switch (type) {
    case 'checkboxes':
    case 'multipleChoiceMatrix':
    case 'checkboxMatrix':
      return [...fieldConditions, ...itemConditions, ...logicConditions];
    case 'countryList':
    case 'multipleChoice':
    case 'dropdown':
      return [...fieldConditions, ...itemConditions];
    case 'linearScale':
    case 'netPromoterScore':
    case 'slider':
      return [...fieldConditions, ...logicConditions];
    case 'text':
      return [...fieldConditions, ...textConditions];
    case 'thumbs':
      return [...fieldConditions, 'equal', 'notEqual'];
    default:
      return [];
  }
}

async function _createQuestionEntities(options = {}) {
  try {
    const { type, company, team, question } = options;

    switch (type) {
      case 'countryList': {
        const [
          { _id: country1 },
          { _id: country2 },
        ] = await Promise.all([
          countryFactory({}),
          countryFactory({}),
        ]);

        return { country1, country2 };
      }
      case 'checkboxes':
      case 'multipleChoice':
      case 'dropdown': {
        const [
          { _id: questionItem1 },
          { _id: questionItem2 },
          { _id: questionItem3 }
        ] = await Promise.all([
          questionItemFactory({ company, team, question }),
          questionItemFactory({ company, team, question }),
          questionItemFactory({ company, team, question })
        ]);

        return { questionItem1, questionItem2, questionItem3 };
      }
      case 'multipleChoiceMatrix':
      case 'checkboxMatrix': {
        const [
          { _id: row1 },
          { _id: row2 },
          { _id: column1 },
          { _id: column2 }
        ] = await Promise.all([
          gridRowFactory({ team, company, question }),
          gridRowFactory({ team, company, question }),
          gridColumnFactory({ team, company, question }),
          gridColumnFactory({ team, company, question }),
        ]);

        return { row1, row2, column1, column2 };
      }
      default: return {};
    }
  } catch (e) {
    return Promise.reject(e);
  }
}

function _setAnswer(options = {}) {
  const { type, surveyItem, condition, entities = {} } = options;

  let questionItem1;
  let questionItem2;
  let questionItem3;
  let country1;
  let country2;
  let row1;
  let row2;
  let column1;
  let column2;

  switch (type) {
    case 'checkboxes':
      ({ questionItem1, questionItem2, questionItem3 } = entities);

      switch (condition) {
        case 'notEmpty':
        case 'selected':
        case 'less':
        case 'notEqual': {
          _.set(answers, [type, condition], {
            [surveyItem]: [questionItem1.toString()]
          });

          return { questionItems: questionItem1, count: 2 };
        }
        case 'notSelected': {
          _.set(answers, [type, condition], {
            [surveyItem]: [questionItem2.toString()]
          });

          return { questionItems: questionItem1 };
        }
        case 'greater': {
          _.set(answers, [type, condition], {
            [surveyItem]: [
              questionItem1.toString(),
              questionItem2.toString(),
              questionItem3.toString()
            ]
          });

          return { count: 2 };
        }
        case 'greaterEqual':
        case 'lessEqual':
        case 'equal': {
          _.set(answers, [type, condition], {
            [surveyItem]: [
              questionItem1.toString(),
              questionItem2.toString()
            ]
          });

          return { count: 2 };
        }
        default: {
          _.set(answers, [type, condition], {});

          return {};
        }
      }
    case 'multipleChoiceMatrix':
    case 'checkboxMatrix':
      ({ row1, row2, column1, column2 } = entities);

      switch (condition) {
        case 'notEmpty':
        case 'selected':
        case 'less':
        case 'notEqual': {
          _.set(answers, [type, condition], {
            [surveyItem]: [{ row: row1.toString(), column: column1.toString() }]
          });

          return { gridRow: row1, gridColumn: column1, count: 2 };
        }
        case 'notSelected': {
          _.set(answers, [type, condition], {
            [surveyItem]: [{ row: row2.toString(), column: column1.toString() }]
          });

          return { gridRow: row2, gridColumn: column1 };
        }
        case 'greater': {
          _.set(answers, [type, condition], {
            [surveyItem]: [
              { row: row1.toString(), column: column1.toString() },
              { row: row1.toString(), column: column2.toString() },
              { row: row1.toString(), column: column2.toString() },
            ]
          });

          return { count: 2 };
        }
        case 'greaterEqual':
        case 'lessEqual':
        case 'equal': {
          _.set(answers, [type, condition], {
            [surveyItem]: [
              { row: row1.toString(), column: column1.toString() },
              { row: row1.toString(), column: column2.toString() }
            ]
          });

          return { count: 2 };
        }
        default: {
          _.set(answers, [type, condition], {});

          return {};
        }
      }
    case 'countryList':
      ({ country1, country2 } = entities);

      switch (condition) {
        case 'notEmpty':
        case 'selected': {
          _.set(answers, [type, condition], {
            [surveyItem]: country1.toString()
          });

          return { country: country1 };
        }
        case 'notSelected': {
          _.set(answers, [type, condition], {
            [surveyItem]: country1.toString()
          });

          return { country: country2 };
        }
        default: {
          _.set(answers, [type, condition], {});

          return {};
        }
      }
    case 'multipleChoice':
    case 'dropdown':
      ({ questionItem1, questionItem2, questionItem3 } = entities);

      switch (condition) {
        case 'notEmpty':
        case 'selected': {
          _.set(answers, [type, condition], {
            [surveyItem]: questionItem1.toString()
          });

          return { questionItems: questionItem1 };
        }
        case 'notSelected': {
          _.set(answers, [type, condition], {
            [surveyItem]: questionItem2.toString()
          });

          return { questionItems: questionItem1 };
        }
        default: {
          _.set(answers, [type, condition], {});

          return {};
        }
      }
    case 'linearScale':
    case 'netPromoterScore':
    case 'slider':
      switch (condition) {
        case 'notEmpty':
        case 'selected':
        case 'less':
        case 'notEqual': {
          _.set(answers, [type, condition], {
            [surveyItem]: 1
          });

          return { value: 2 };
        }
        case 'notSelected': {
          _.set(answers, [type, condition], {
            [surveyItem]: 1
          });

          return { value: 2 };
        }
        case 'greater': {
          _.set(answers, [type, condition], {
            [surveyItem]: 3
          });

          return { value: 2 };
        }
        case 'greaterEqual':
        case 'lessEqual':
        case 'equal': {
          _.set(answers, [type, condition], {
            [surveyItem]: 2
          });

          return { value: 2 };
        }
        default: {
          _.set(answers, [type, condition], {});

          return {};
        }
      }
    case 'text':
      switch (condition) {
        case 'notEmpty': {
          _.set(answers, [type, condition], {
            [surveyItem]: 'text'
          });

          return {};
        }
        case 'equal':
        case 'matchRegExp': {
          _.set(answers, [type, condition], {
            [surveyItem]: 'text'
          });

          return { value: 'text' };
        }
        case 'notEqual':
        {
          _.set(answers, [type, condition], {
            [surveyItem]: 'text'
          });

          return { value: 'notText' };
        }
        case 'contains': {
          _.set(answers, [type, condition], {
            [surveyItem]: 'should contains text'
          });

          return { value: 'contains' };
        }
        case 'notContains': {
          _.set(answers, [type, condition], {
            [surveyItem]: 'another text'
          });

          return { value: 'contains' };
        }
        case 'beginsWith': {
          _.set(answers, [type, condition], {
            [surveyItem]: 'begins text'
          });

          return { value: 'begins' };
        }
        case 'endsWith': {
          _.set(answers, [type, condition], {
            [surveyItem]: 'text end'
          });

          return { value: 'end' };
        }
        default: {
          _.set(answers, [type, condition], {});

          return {};
        }
      }
    case 'thumbs':
      switch (condition) {
        case 'equal':
        case 'notEmpty': {
          _.set(answers, [type, condition], {
            [surveyItem]: 'yes'
          });

          return { value: 'yes' };
        }
        case 'notEqual': {
          _.set(answers, [type, condition], {
            [surveyItem]: 'yes'
          });

          return { value: 'no' };
        }
        default: {
          _.set(answers, [type, condition], {});

          return {};
        }
      }
    default:
      return [];
  }
}

async function makeTestData() {
  let surveySection;

  // create company and team
  ({ _id: team, company: { _id: company } } = await teamFactory({}));

  // create survey and get surveyId
  const { _id: survey } = { _id: surveyId } = await surveyFactory({ company, team });

  // create surveySections
  await async.each(_.range(3), (sortableId, cb) => {
    surveySectionFactory({
      company,
      team,
      survey,
      sortableId
    }).then(({ _id, sortableId }) => {
      if (!sortableId) surveySection = _id;

      cb();
    })
      .catch(cb);
  });

  // create questions
  await async.eachOfLimit(questionTypes, 5, (type, sortableId, callback) => {
    questionFactory({ company, team, type })
      .then(({ _id: question }) => {
        questions[type] = question;

        Promise.all([
          surveyItemFactory({
            team,
            company,
            survey,
            surveySection,
            sortableId,
            question
          })
        ])
          .then(([{ _id: surveyItem }]) => {
            surveyItems[type] = surveyItem;

            async.eachLimit(_getConditions(type), 5, (condition, cb) => {
              Promise
                .all([
                  flowLogicFactory({
                    team,
                    company,
                    sortableId,
                    surveyItem
                  }),
                  surveyResultFactory({
                    team,
                    company,
                    survey,
                    fingerprintId: `${type}${condition}`
                  })
                ])
                .then(([{ _id: flowLogic }]) => {
                  _.set(flowLogicDocs, [type, condition], flowLogic);

                  cb();
                })
                .catch(cb);
            })
              .then(() => callback())
              .catch(callback);
          })
          .catch(callback);
      })
      .catch(callback);
  });

  // create content amd get completeMessage
  const content = await contentFactory({});

  await APIMessagesExtractor.loadData();

  completeMessage = content.apiMessages.survey.isCompleted;
}

describe('Flow Logic', () => {
  before(cleanData);

  before(makeTestData);

  questionTypes.forEach((type) => {
    describe(type, () => {
      _getConditions(type).forEach((condition) => {
        before(async () => {
          const surveyItem = surveyItems[type];
          const question = questions[type];

          const entities = await _createQuestionEntities({ type, company, team, question });
          const attr = await _setAnswer({ type, surveyItem, condition, entities });

          await flowItemFactory({
            ...attr,
            survey: surveyId,
            team,
            company,
            flowLogic: flowLogicDocs[type][condition],
            condition,
            questionType: type
          });
        });

        it(condition, async () => {
          const res = await request(app)
            .put('/api/v1/survey-answers')
            .send({
              surveyId,
              fingerprintId: `${type}${condition}`,
              answer: answers[type][condition]
            })
            .expect(httpStatus.OK);

          expect(res.body.message).to.be.eq(completeMessage);

          await FlowLogic.model.deleteOne({ _id: flowLogicDocs[type][condition] });
        });
      });
    });
  });

  it('should return last section', async () => {
    const fingerprintId = 'toSectionTest';
    const survey = await surveyFactory({ team, company });
    const question = await questionFactory({ team, company });

    const [
      surveySection1,
      surveySection2,
      surveySection3,
    ] = await Promise.all([
      surveySectionFactory({ team, company, survey, sortableId: 0 }),
      surveySectionFactory({ team, company, survey, sortableId: 1 }),
      surveySectionFactory({ team, company, survey, sortableId: 2 })
    ]);

    const [
      surveyItem,
      surveyItemSkippedByFlow,
    ] = await Promise.all([
      surveyItemFactory({ company, team, survey, question, surveySection: surveySection1 }),
      surveyItemFactory({ company, team, survey, question, surveySection: surveySection2 }),
      surveyItemFactory({ company, team, survey, question, surveySection: surveySection3 }),
      surveyResultFactory({ survey, fingerprintId })
    ]);

    const flowLogic = await flowLogicFactory({
      team,
      company,
      surveyItem,
      method: 'every',
      action: 'toSection',
      section: surveySection3
    });

    await flowItemFactory({
      team,
      company,
      flowLogic,
      survey,
      questionType: 'text',
      condition: 'equal',
      value: 'hello'
    });

    const res = await request(app)
      .put('/api/v1/survey-answers')
      .send({
        fingerprintId,
        answer: { [surveyItem._id]: 'hello' },
        surveyId: survey._id
      })
      .expect(httpStatus.OK);

    const reloadResult = await SurveyResult.model
      .findOne({ fingerprintId })
      .lean();

    const { answer } = reloadResult;

    expect(answer.skippedByFlow.length).to.be.eq(1);
    expect(answer.skippedByFlow[0]).to.be.eq(surveyItemSkippedByFlow._id.toString());
    expect(res.body.survey.surveySection.step).to.be.eq(2);
  });
});
