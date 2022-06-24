import chai, { expect } from 'chai';
import app from 'index'; // eslint-disable-line

// models
import {
  WebhookHistory,
  SurveySection,
  SurveyResult,
  Survey,
} from 'server/models';

// services
import APIMessagesExtractor from 'server/services/APIMessagesExtractor';

// helpers
import cleanData from 'server/tests/testHelpers/cleanData';

// factories
import {
  contentFactory,
  companyFactory,
  surveyFactory,
  surveySectionFactory,
  questionFactory,
  surveyItemFactory,
  questionItemFactory,
  surveyResultFactory,
  inviteFactory,
  webhookFactory
} from 'server/tests/factories';

chai.config.includeStack = true;

let survey;
let surveyResult;
let surveyResult2;
let surveyItem1;
let surveyItem2;
let textQuestion;
let checkboxQuestion;
let qItem1;
let qItem2;
let qItem3;
let answer;
let company;

async function makeTestData() {
  await contentFactory({});
  await APIMessagesExtractor.loadData();

  company = await companyFactory();

  [
    survey
  ] = await Promise.all([
    surveyFactory({ company }),
    surveyFactory({ company, public: true })
  ]);

  const surveySection = await surveySectionFactory({ survey, sortableId: 0 });

  [
    textQuestion,
    checkboxQuestion
  ] = await Promise.all([
    questionFactory({ company }),
    questionFactory({ company, type: 'checkboxes' })
  ]);

  [
    qItem1,
    qItem2,
    qItem3,
  ] = await Promise.all([
    questionItemFactory({ company, question: checkboxQuestion }),
    questionItemFactory({ company, question: checkboxQuestion }),
    questionItemFactory({ company, question: checkboxQuestion }),
  ]);

  [
    surveyItem1,
    surveyItem2,
  ] = await Promise.all([
    surveyItemFactory({ company, survey, question: textQuestion, surveySection }),
    surveyItemFactory({ company, survey, question: checkboxQuestion, surveySection })
  ]);

  [
    surveyResult,
    surveyResult2
  ] = await Promise.all([
    surveyResultFactory({ company, survey, completed: true }),
    surveyResultFactory({ company, survey })
  ]);

  answer = {
    [surveyItem1._id]: 'hello',
    [surveyItem2._id]: [qItem1._id.toString(), qItem2._id.toString()]
  };

  surveyResult._answer = answer;
  surveyResult._surveySection = await SurveySection.model
    .findOne({ _id: surveySection._id })
    .populate([
      {
        path: 'surveyItems',
        match: {
          hide: { $ne: true },
          inTrash: { $ne: true },
          inDraft: { $ne: true }
        },
        populate: [
          {
            path: 'question',
            select: 'name type trend',
            populate: [
              {
                path: 'questionItems',
                select: '_id name',
                match: {
                  inTrash: { $ne: true },
                  inDraft: { $ne: true }
                },
              },
              {
                path: 'gridRows',
                select: '_id name',
                match: {
                  inTrash: { $ne: true },
                  inDraft: { $ne: true }
                },
              },
              {
                path: 'gridColumns',
                select: '_id name',
                match: {
                  inTrash: { $ne: true },
                  inDraft: { $ne: true }
                },
              }
            ]
          },
          {
            path: 'flowLogic',
            match: { inDraft: { $ne: true } },
            populate: [
              {
                path: 'flowItems',
                match: { inDraft: { $ne: true } },
              }
            ]
          }
        ]
      }
    ])
    .lean();

  // create invites
  await Promise.all([
    inviteFactory({ company, survey, token: surveyResult.token }),
    inviteFactory({ company, survey }),
    inviteFactory({ company, survey }),
  ]);

  await surveyResult.save();
}

// TODO refactor tests!!! + check all test labels + refactor item1,item2,.....item999 variables
describe('Survey Result Model', () => {
  before(cleanData);

  before(makeTestData);

  describe('Pre save', () => {
    describe('Presence of identification', () => {
      it('should return error when fingerprintId and token are not present', async () => {
        try {
          const surveyResult = await surveyResultFactory({ company, survey });
          surveyResult.fingerprintId = undefined;
          surveyResult.token = undefined;
          await surveyResult2.save();
        } catch (e) {
          expect(e.errors.public.message).to.be.eq('Something went wrong');
        }
      });
    });

    describe('Valid attributes', () => {
      it('should set correct answer', async () => {
        // load survey result
        const reloadSurveyResult = await SurveyResult.model
          .findOne({ _id: surveyResult })
          .lean();

        // check answer
        expect(reloadSurveyResult.answer).to.be.an('object');
        expect(reloadSurveyResult.answer[surveyItem1._id].value).to.be.eq('hello');
        expect(reloadSurveyResult.answer[surveyItem2._id].questionItems.length).to.be.eq(2);
        expect(reloadSurveyResult.answer[surveyItem2._id].questionItems)
          .to.include.members([qItem1._id.toString(), qItem2._id.toString()]);
      });

      it('should set new answer', async () => {
        // new answer
        answer = {
          [surveyItem1._id]: 'test value',
          [surveyItem2._id]: [qItem3._id.toString()]
        };

        // re-save result
        surveyResult._answer = answer;
        await surveyResult.save();

        // load survey result
        const reloadSurveyResult = await SurveyResult.model
          .findOne({ _id: surveyResult })
          .lean();

        // check answer
        expect(reloadSurveyResult.answer).to.be.an('object');
        expect(reloadSurveyResult.answer[surveyItem1._id].value).to.be.eq('test value');
        expect(reloadSurveyResult.answer[surveyItem2._id].questionItems.length).to.be.eq(1);
        expect(reloadSurveyResult.answer[surveyItem2._id].questionItems)
          .to.include.members([qItem3._id.toString()]);
      });
    });

    describe('Increment total results', () => {
      it('should not increment total results, with empty result', async () => {
        const surveyBefore = await Survey.model.findById(survey);
        const totalResultsBefore = parseInt(surveyBefore.totalResults, 10);

        await surveyResultFactory({ company, survey });

        const surveyReload = await Survey.model.findById(survey);

        expect(surveyReload.totalResults).to.be.eq(totalResultsBefore);
      });

      it('should increment total results, if result became not empty', async () => {
        const surveyBefore = await Survey.model.findById(survey);
        const totalResultsBefore = parseInt(surveyBefore.totalResults, 10);

        const surveyResult = new SurveyResult.model({ company, survey, token: 'token1' });

        surveyResult.empty = false;
        surveyResult._answer = {};

        await surveyResult.save();

        const surveyReload = await Survey.model.findById(survey);

        expect(surveyReload.totalResults).to.be.eq(totalResultsBefore + 1);
      });
    });

    describe('Is complete', () => {
      it('should set lastAnswerDate and increase totalComplete to survey', async () => {
        const surveyBefore = await Survey.model.findById(survey);
        const totalCompBefore = parseInt(surveyBefore.totalCompleted, 10);
        const lastAnsBefore = surveyBefore.lastAnswerDate;

        // create result
        const surveyResult = await surveyResultFactory({ company, survey });
        surveyResult.completed = true;
        await surveyResult.save();

        const surveyReload = await Survey.model.findById(survey);

        expect(surveyReload.totalCompleted).to.be.eq(totalCompBefore + 1);
        expect(surveyReload.lastAnswerDate).to.be.not.eq(lastAnsBefore);
        expect(surveyReload.lastAnswerDate.toString()).to.be.eq(surveyResult.updatedAt.toString());
      });
    });
  });

  describe('Post Save: Webhooks', () => {
    beforeEach(async () => {
      // create new survey result
      surveyResult = await surveyResultFactory({ company, survey });
    });

    describe('optionSelected', () => {
      // create webhooks
      let optionSelectedWH;
      before(async () => {
        optionSelectedWH = await webhookFactory({ company, type: 'optionSelected' });
      });

      it('should send webhook and create history', async () => {
        const whHistoryBefore = await WebhookHistory.model
          .find({ webhook: optionSelectedWH, eventType: 'optionSelected' })
          .count();

        const surveyResult = await surveyResultFactory({
          company,
          survey
        });

        // trigger hook
        surveyResult._optionSelectedWH = {
          [surveyItem2._id]: [qItem3._id.toString()]
        };
        await surveyResult.save();

        await new Promise((res, rej) => {
          setTimeout(async () => {
            try {
              const whHistoryAfter = await WebhookHistory.model
                .find({ webhook: optionSelectedWH, eventType: 'optionSelected' })
                .count();

              expect(whHistoryBefore).to.be.eq(0);
              expect(whHistoryAfter).to.be.eq(1);

              res();
            } catch (e) {
              rej(e);
            }
          }, 100);
        });
      });
    });

    describe('surveyCompleted', () => {
      // create webhooks
      let surveyCompletedWH;
      before(async () => {
        surveyCompletedWH = await webhookFactory({ company, type: 'surveyCompleted' });
      });

      it('should send webhook and create history', async () => {
        const whHistoryBefore = await WebhookHistory.model
          .find({ webhook: surveyCompletedWH, eventType: 'surveyCompleted' })
          .count();

        const surveyResult = await surveyResultFactory({
          company,
          survey
        });

        // trigger hook
        surveyResult.completed = true;
        await surveyResult.save();

        await new Promise((res, rej) => {
          setTimeout(async () => {
            try {
              const whHistoryAfter = await WebhookHistory.model
                .find({ webhook: surveyCompletedWH, eventType: 'surveyCompleted' })
                .count();

              expect(whHistoryBefore).to.be.eq(0);
              expect(whHistoryAfter).to.be.eq(1);

              res();
            } catch (e) {
              rej(e);
            }
          }, 100);
        });
      });
    });

    describe('wildcard', () => {
      // create webhooks
      let wildcardWH;
      before(async () => {
        wildcardWH = await webhookFactory({ company, type: '*' });
      });

      it('should send webhook and create history for "optionSelected"', async () => {
        const whHistoryBefore = await WebhookHistory.model
          .find({ webhook: wildcardWH, eventType: 'optionSelected' })
          .count();

        const surveyResult = await surveyResultFactory({
          company,
          survey
        });

        // trigger hook
        surveyResult._optionSelectedWH = {
          [surveyItem2._id]: [qItem3._id.toString()]
        };
        await surveyResult.save();

        await new Promise((res, rej) => {
          setTimeout(async () => {
            try {
              const whHistoryAfter = await WebhookHistory.model
                .find({ webhook: wildcardWH, eventType: 'optionSelected' })
                .count();

              expect(whHistoryBefore).to.be.eq(0);
              expect(whHistoryAfter).to.be.eq(1);

              res();
            } catch (e) {
              rej(e);
            }
          }, 100);
        });
      });

      it('should send webhook and create history for "surveyCompleted', async () => {
        const whHistoryBefore = await WebhookHistory.model
          .find({ webhook: wildcardWH, eventType: 'surveyCompleted' })
          .count();

        const surveyResult = await surveyResultFactory({
          company,
          survey
        });

        // trigger hook
        surveyResult.completed = true;
        await surveyResult.save();

        await new Promise((res, rej) => {
          setTimeout(async () => {
            try {
              const whHistoryAfter = await WebhookHistory.model
                .find({ webhook: wildcardWH, eventType: 'surveyCompleted' })
                .count();

              expect(whHistoryBefore).to.be.eq(0);
              expect(whHistoryAfter).to.be.eq(1);

              res();
            } catch (e) {
              rej(e);
            }
          }, 100);
        });
      });
    });
  });
});
