import chai, { expect } from 'chai';
import app from 'index'; // eslint-disable-line

// helpers
import cleanData from 'server/tests/testHelpers/cleanData';

// factories
import {
  teamFactory,
  companyFactory,
  trashFactory,
  questionFactory,
  questionItemFactory,
  dashboardItemFactory,
  tagEntityFactory,
  gridColumnFactory,
  gridRowFactory,
  questionStatisticFactory,
  surveyItemFactory,
  surveyResultFactory,
  surveyFactory,
  surveySectionFactory,
  inviteFactory,
  surveyThemeFactory,
  contentItemFactory,
  flowLogicFactory,
  tagFactory,
  emailFactory,
  teamUserFactory,
  assetFactory,
  contactFactory,
  userFactory
} from '../factories';

// models
import {
  Trash,
  Question,
  QuestionItem,
  DashboardItem,
  Tag,
  TagEntity,
  GridRow,
  GridColumn,
  QuestionStatistic,
  Survey,
  SurveyItem,
  SurveyResult,
  SurveySection,
  SurveyTheme,
  Invite,
  ContentItem,
  FlowLogic,
  Email,
  TeamUser,
  Asset,
  Contact,
  Team,
  User
} from '../../models';

chai.config.includeStack = true;

let company;
let team;

async function makeTestData() {
  company = await companyFactory();
  team = await teamFactory({ company });
}

describe('Trash Model', () => {
  before(cleanData);

  before(makeTestData);

  describe('.clear()', () => {
    describe('errors', () => {
      it('should raise error if stage is not clearing', async () => {
        const trash = await trashFactory({ company, team, stage: 'initial' });

        try {
          await trash.clear();
        } catch (e) {
          expect(e.errors.stage.message).to.be.eq('You already can not restore this item');
        }
      });

      it('should raise error if too much attempts', async () => {
        const trash = await trashFactory({ company, team, stage: 'clearing', attempts: 21 });

        try {
          await trash.clear();
        } catch (e) {
          expect(e.errors.attempts.message).to.be.eq('Too much attempts to clear');
        }
      });
    });

    describe('base', () => {
      it('should remove trash record after success execution', async () => {
        const trash = await trashFactory({ company, team, stage: 'clearing' });

        await trash.clear();

        const trashReload = await Trash.model.findById(trash._id);

        expect(trashReload).to.be.eq(null);
      });

      it('should remove trash item after success execution', async () => {
        const question = await questionFactory({ company, team });
        const trash = await trashFactory({
          company,
          team,
          question,
          type: 'question',
          stage: 'clearing'
        });

        await trash.clear();

        const questionReload = await Question.model.findById(trash.question);

        expect(questionReload).to.be.eq(null);
      });
    });

    describe('Survey/Template', () => {
      let survey;

      beforeEach(async () => {
        ({ _id: survey } = await surveyFactory({ company, team }));

        await Promise.all([
          surveySectionFactory({ survey, company, team }),
          surveySectionFactory({ survey, company, team }),

          surveyResultFactory({ survey, company, team }),
          surveyResultFactory({ survey, company, team }),

          inviteFactory({ survey, company, team }),
          inviteFactory({ survey, company, team }),

          dashboardItemFactory({ survey, company, team }),
          dashboardItemFactory({ survey, company, team }),

          tagEntityFactory({ survey, company, team }),
          tagEntityFactory({ survey, company, team }),

          surveyThemeFactory({ survey, company, team }),
          surveyThemeFactory({ survey, company, team })
        ]);
      });

      it('should clear all related survey entities', async () => {
        const trash = await trashFactory({
          company,
          team,
          survey,
          type: 'survey',
          stage: 'clearing'
        });

        await trash.clear();

        const results = await Promise.all([
          SurveySection.model.find({ survey }).countDocuments(),
          SurveyResult.model.find({ survey }).countDocuments(),
          Invite.model.find({ survey }).countDocuments(),
          DashboardItem.model.find({ survey }).countDocuments(),
          TagEntity.model.find({ survey }).countDocuments(),
          SurveyTheme.model.find({ survey }).countDocuments()
        ]);

        expect(results.every(i => i === 0)).to.be.eq(true);
      });

      it('should soft delete related survey items', async () => {
        const [
          surveyItem1,
          surveyItem2
        ] = await Promise.all([
          surveyItemFactory({ survey, company, team }),
          surveyItemFactory({ survey, company, team }),
        ]);

        const trash = await trashFactory({
          company,
          team,
          survey,
          type: 'survey',
          stage: 'clearing'
        });

        await trash.clear();

        const [
          surveyItem1Reload,
          surveyItem2Reload,
          trashRecord1,
          trashRecord2
        ] = await Promise.all([
          SurveyItem.model.findById(surveyItem1),
          SurveyItem.model.findById(surveyItem2),
          Trash.model.findOne({ surveyItem: surveyItem1 }),
          Trash.model.findOne({ surveyItem: surveyItem2 })
        ]);

        expect(surveyItem1Reload.inTrash).to.be.eq(true);
        expect(surveyItem2Reload.inTrash).to.be.eq(true);
        expect(trashRecord1.stage).to.be.eq('clearing');
        expect(trashRecord2.stage).to.be.eq('clearing');
      });
    });

    describe('Survey Item', () => {
      let surveyItem;
      let trendSurveyItem;
      let contentSurveyItem;
      let question;
      let trendQuestion;
      let contentItem;

      beforeEach(async () => {
        [
          question,
          trendQuestion
        ] = await Promise.all([
          questionFactory({ company, team }),
          questionFactory({ company, team, trend: true })
        ]);

        [
          surveyItem,
          trendSurveyItem,
          contentSurveyItem
        ] = await Promise.all([
          surveyItemFactory({ company, team, question }),
          surveyItemFactory({ company, team, question: trendQuestion, type: 'trendQuestion' }),
          surveyItemFactory({ company, team, question, type: 'contents' }),
        ]);

        [
          contentItem
        ] = await Promise.all([
          contentItemFactory({ company, team, surveyItem: contentSurveyItem }),
          questionStatisticFactory({ question, surveyItem }),
          flowLogicFactory({ question, surveyItem })
        ]);
      });

      it('should clear all related surveyItem entities', async () => {
        const trash = await trashFactory({
          company,
          team,
          surveyItem,
          type: 'surveyItem',
          stage: 'clearing'
        });

        await trash.clear();

        const [
          reloadSurveyItem,
          reloadQuestion,
          reloadQuestionStatistic,
          reloadFLowLogic
        ] = await Promise.all([
          SurveyItem.model.findOne({ _id: surveyItem._id }).lean(),
          Question.model.findOne({ _id: question._id }).lean(),
          QuestionStatistic.model.findOne({ surveyItem: surveyItem._id }).lean(),
          FlowLogic.model.findOne({ surveyItem: surveyItem._id }).lean()
        ]);

        expect(reloadFLowLogic).to.be.eq(null);
        expect(reloadSurveyItem).to.be.eq(null);
        expect(reloadQuestionStatistic).to.be.eq(null);
        expect(reloadQuestion.inTrash).to.be.eq(true);
      });

      it('should clear all related trendQuestion surveyItem entities', async () => {
        const trash = await trashFactory({
          company,
          team,
          surveyItem: trendSurveyItem,
          type: 'surveyItem',
          stage: 'clearing'
        });

        await trash.clear();

        const [
          reloadSurveyItem,
          reloadQuestion
        ] = await Promise.all([
          SurveyItem.model.findOne({ _id: trendSurveyItem._id }).lean(),
          Question.model.findOne({ _id: question._id }).lean(),
        ]);

        expect(reloadSurveyItem).to.be.eq(null);
        expect(reloadQuestion.inTrash).to.be.eq(false);
      });

      it('should soft delete content items', async () => {
        const trash = await trashFactory({
          company,
          team,
          surveyItem: contentSurveyItem,
          type: 'surveyItem',
          stage: 'clearing'
        });

        await trash.clear();

        const [
          reloadSurveyItem,
          reloadContentItem
        ] = await Promise.all([
          SurveyItem.model.findOne({ _id: contentSurveyItem._id }).lean(),
          ContentItem.model.findOne({ _id: contentItem._id }).lean(),
        ]);

        expect(reloadSurveyItem).to.be.eq(null);
        expect(reloadContentItem.inTrash).to.be.eq(true);
      });
    });

    describe('Question', () => {
      let question;

      beforeEach(async () => {
        question = await questionFactory({ company, team, type: 'multipleChoice' });

        await Promise.all([
          questionItemFactory({ question, team, company }),
          questionItemFactory({ question, team, company }),

          dashboardItemFactory({ question, team, company }),
          dashboardItemFactory({ question, team, company }),

          tagEntityFactory({ question, team, company }),
          tagEntityFactory({ question, team, company }),

          gridColumnFactory({ question, team, company }),
          gridColumnFactory({ question, team, company }),

          gridRowFactory({ question, team, company }),
          gridColumnFactory({ question, team, company }),

          questionStatisticFactory({ question, team, company }),
          questionStatisticFactory({ question, team, company }),

          surveyItemFactory({ question, team, company }),
          surveyItemFactory({ question, team, company }),
        ]);
      });

      it('should clear all related question entities', async () => {
        const trash = await trashFactory({ company, team, question, stage: 'clearing' });

        await trash.clear();

        const results = await Promise.all([
          QuestionItem.model.find({ question }).countDocuments(),
          DashboardItem.model.find({ question }).countDocuments(),
          TagEntity.model.find({ question }).countDocuments(),
          GridRow.model.find({ question }).countDocuments(),
          GridColumn.model.find({ question }).countDocuments(),
          QuestionStatistic.model.find({ question }).countDocuments(),
          SurveyItem.model.find({ question }).countDocuments()
        ]);

        expect(results.every(i => i === 0)).to.be.eq(true);
      });

      it('should remove and replace trend question', async () => {
        question = await questionFactory({ team, company, trend: true, type: 'dropdown' });

        const [
          survey1,
          survey2,
          survey3
        ] = await Promise.all([
          surveyFactory({ team, company }),
          surveyFactory({ team, company }),
          surveyFactory({ team, company })
        ]);

        const [
          questionItem1,
          questionItem2,
          questionItem3
        ] = await Promise.all([
          questionItemFactory({ team, company, question }),
          questionItemFactory({ team, company, question }),
          questionItemFactory({ team, company, question })
        ]);

        const questionItemIds = [
          questionItem1._id.toString(),
          questionItem2._id.toString(),
          questionItem3._id.toString()
        ];

        const [
          surveyItem1,
          surveyItem2,
          surveyItem3
        ] = await Promise.all([
          surveyItemFactory({ team, company, question, type: 'trendQuestion', survey: survey1 }),
          surveyItemFactory({ team, company, question, type: 'trendQuestion', survey: survey2 }),
          surveyItemFactory({ team, company, question, type: 'trendQuestion', survey: survey3 })
        ]);

        await Promise.all([
          surveyResultFactory({
            team,
            company,
            survey: survey1,
            answer: {
              [surveyItem1._id]: {
                questionItems: [questionItem1._id.toString()]
              }
            }
          }),
          surveyResultFactory({
            team,
            company,
            survey: survey2,
            answer: {
              [surveyItem2._id]: {
                questionItems: [questionItem2._id.toString()]
              }
            }
          }),
          surveyResultFactory({
            team,
            company,
            survey: survey3,
            answer: {
              [surveyItem3._id]: {
                questionItems: [questionItem3._id.toString()]
              }
            }
          }),

          questionStatisticFactory({
            question,
            surveyItem: surveyItem1._id,
            data: {
              [questionItem1._id]: 1
            }
          }),
          questionStatisticFactory({
            question,
            surveyItem: surveyItem2._id,
            data: {
              [questionItem2._id]: 1
            }
          }),
          questionStatisticFactory({
            question,
            surveyItem: surveyItem3._id,
            data: {
              [questionItem3._id]: 1
            }
          })
        ]);

        const trash = await trashFactory({
          team,
          company,
          question,
          type: 'question',
          stage: 'clearing'
        });

        await trash.clear();

        const reloadSurveyItems = await SurveyItem.model
          .find({
            _id: {
              $in: [
                surveyItem1._id,
                surveyItem2._id,
                surveyItem3._id
              ]
            }
          })
          .populate({
            path: 'question',
            populate: {
              path: 'questionItems'
            }
          })
          .lean();

        reloadSurveyItems.forEach((surveyItem) => {
          expect(surveyItem.type).to.be.eq('question');
          expect(surveyItem.question._id.toString()).to.not.eq(question._id.toString());
          expect(surveyItem.question.trend).to.not.eq(true);

          surveyItem.question.questionItems.forEach((questionItem) => {
            expect(!questionItemIds.includes(questionItem._id.toString()))
              .to.be.eq(true);
          });
        });

        const [
          reloadSurveyResult1,
          reloadSurveyResult2,
          reloadSurveyResult3
        ] = await Promise.all([
          SurveyResult.model
            .findOne({ survey: survey1._id })
            .lean(),
          SurveyResult.model
            .findOne({ survey: survey2._id })
            .lean(),
          SurveyResult.model
            .findOne({ survey: survey3._id })
            .lean()
        ]);

        expect(reloadSurveyResult1.answer[surveyItem1._id].questionItems[0])
          .to.not.eq(questionItem1._id.toString());
        expect(reloadSurveyResult2.answer[surveyItem2._id].questionItems[0])
          .to.not.eq(questionItem2._id.toString());
        expect(reloadSurveyResult3.answer[surveyItem3._id].questionItems[0])
          .to.not.eq(questionItem3._id.toString());

        const reloadQuestionStatistic = await QuestionStatistic.model
          .find({
            surveyItem: {
              $in: [
                surveyItem1._id,
                surveyItem2._id,
                surveyItem3._id
              ]
            }
          })
          .lean();

        reloadQuestionStatistic.forEach((statistic) => {
          expect(statistic.question.toString()).to.not.eq(question._id.toString());
          expect(statistic.syncDB).to.be.eq(false);
        });
      });
    });

    describe('Team', () => {
      let teamToRemove;
      let tag;
      let email;
      let teamUser;
      let asset;
      let contact;
      let survey;
      let question;

      before(async () => {
        teamToRemove = await teamFactory({ company });

        [
          tag,
          email,
          teamUser,
          asset,
          contact,
          survey,
          question
        ] = await Promise.all([
          tagFactory({ team: teamToRemove }),
          emailFactory({ team: teamToRemove }),
          teamUserFactory({ team: teamToRemove }),
          assetFactory({ team: teamToRemove }),
          contactFactory({ team: teamToRemove }),
          surveyFactory({ team: teamToRemove }),
          questionFactory({ team: teamToRemove, trend: true })
        ]);

        await tagEntityFactory({ tag });
      });

      it('should remove team and related entities', async () => {
        const trash = await trashFactory({
          type: 'team',
          team: teamToRemove,
          stage: 'clearing'
        });

        await trash.clear();

        const results = await Promise.all([
          Tag.model.findOne({ _id: tag._id }),
          TagEntity.model.findOne({ tag: tag._id }),
          Email.model.findOne({ _id: email._id }),
          TeamUser.model.findOne({ _id: teamUser._id }),
          Asset.model.findOne({ _id: asset._id }),
          Contact.model.findOne({ _id: contact._id }),
          Team.model.findOne({ _id: teamToRemove._id })
        ]);

        expect(results.every(i => i === null)).to.be.eq(true);

        const trashes = await Promise.all([
          Trash.model.findOne({ type: 'survey', survey: survey._id, stage: 'clearing' }),
          Trash.model.findOne({ type: 'question', question: question._id, stage: 'clearing' })
        ]);

        expect(trashes.every(i => i.stage === 'clearing')).to.be.eq(true);
        expect(trashes.every(i => i.parentRecord.toString() === trash._id.toString()))
          .to.be.eq(true);
      });

      it('should switch users current team', async () => {
        teamToRemove = await teamUserFactory({ company });

        const trash = await trashFactory({
          type: 'team',
          team: teamToRemove,
          stage: 'clearing'
        });

        const user = await userFactory({ currentTeam: teamToRemove });

        const [
          teamUser1
        ] = await Promise.all([
          teamUserFactory({ user, company, team: teamToRemove }),
          teamUserFactory({ user, company, team })
        ]);

        await trash.clear();

        const [
          reloadTeamUser,
          reloadUser
        ] = await Promise.all([
          TeamUser.model
            .findOne({ _id: teamUser1._id })
            .lean(),
          User.model
            .findOne({ _id: user._id })
            .lean()
        ]);

        expect(reloadTeamUser).to.be.eq(null);
        expect(reloadUser.currentTeam.toString())
          .to.be.eq(team._id.toString());
      });
    });
  });

  describe('.restore()', () => {
    describe('errors', () => {
      it('should raise error if stage is clearing', async () => {
        const trash = await trashFactory({ company, team, stage: 'clearing' });

        try {
          await trash.clear();
        } catch (e) {
          expect(e.errors.stage.message).to.be.eq('You already can not restore this item');
        }
      });
    });

    describe('Question', () => {
      it('should restore question and remove trash record', async () => {
        const question = await questionFactory({ company, team });
        await question.softDelete();

        expect(question.inTrash).to.be.eq(true);

        const trash = await Trash.model.findOne({ question });
        await trash.restore();

        const questionReload = await Question.model.findById(question._id);
        const trashReload = await Trash.model.findById(trash._id);

        expect(questionReload.inTrash).to.be.eq(false);
        expect(trashReload).to.be.eq(null);
      });
    });

    describe('Survey', () => {
      it('should restore survey and remove trash record', async () => {
        const survey = await surveyFactory({ company, team });
        await survey.softDelete();

        expect(survey.inTrash).to.be.eq(true);

        const trash = await Trash.model.findOne({ survey });
        await trash.restore();

        const surveyReload = await Survey.model.findById(survey._id);
        const trashReload = await Trash.model.findById(trash._id);

        expect(surveyReload.inTrash).to.be.eq(false);
        expect(trashReload).to.be.eq(null);
      });
    });

    describe('Template', () => {
      it('should restore template and remove trash record', async () => {
        const template = await surveyFactory({ company, team, type: 'template' });
        await template.softDelete({ type: 'template' });

        expect(template.inTrash).to.be.eq(true);

        const trash = await Trash.model.findOne({ survey: template, type: 'template' });
        await trash.restore();

        const templateReload = await Survey.model.findById(template._id);
        const trashReload = await Trash.model.findById(trash._id);

        expect(templateReload.inTrash).to.be.eq(false);
        expect(trashReload).to.be.eq(null);
      });
    });

    describe('QuestionItem', () => {
      it('should restore question item and remove trash record', async () => {
        const questionItem = await questionItemFactory({ company, team });
        await questionItem.softDelete();

        expect(questionItem.inTrash).to.be.eq(true);

        const trash = await Trash.model.findOne({ questionItem });
        await trash.restore();

        const questionItemReload = await QuestionItem.model.findById(questionItem._id);
        const trashReload = await Trash.model.findById(trash._id);

        expect(questionItemReload.inTrash).to.be.eq(false);
        expect(trashReload).to.be.eq(null);
      });
    });

    describe('GridRow', () => {
      it('should restore grid row and remove trash record', async () => {
        const gridRow = await gridRowFactory({ company, team });
        await gridRow.softDelete();

        expect(gridRow.inTrash).to.be.eq(true);

        const trash = await Trash.model.findOne({ gridRow });
        await trash.restore();

        const gridRowReload = await GridRow.model.findById(gridRow._id);
        const trashReload = await Trash.model.findById(trash._id);

        expect(gridRowReload.inTrash).to.be.eq(false);
        expect(trashReload).to.be.eq(null);
      });
    });

    describe('GridColumn', () => {
      it('should restore grid row and remove trash record', async () => {
        const gridColumn = await gridColumnFactory({ company, team });
        await gridColumn.softDelete();

        expect(gridColumn.inTrash).to.be.eq(true);

        const trash = await Trash.model.findOne({ gridColumn });
        await trash.restore();

        const gridColumnReload = await GridColumn.model.findById(gridColumn._id);
        const trashReload = await Trash.model.findById(trash._id);

        expect(gridColumnReload.inTrash).to.be.eq(false);
        expect(trashReload).to.be.eq(null);
      });
    });

    describe('SurveyItem', () => {
      it('should restore survey item and remove trash record', async () => {
        const surveyItem = await surveyItemFactory({ company, team });
        await surveyItem.softDelete();

        expect(surveyItem.inTrash).to.be.eq(true);

        const trash = await Trash.model.findOne({ surveyItem });
        await trash.restore();

        const surveyItemReload = await SurveyItem.model.findById(surveyItem._id);
        const trashReload = await Trash.model.findById(trash._id);

        expect(surveyItemReload.inTrash).to.be.eq(false);
        expect(trashReload).to.be.eq(null);
      });

      it('should restore survey item to another section if section is deleted', async () => {
        const survey = await surveyFactory({ company, team });
        const surveySection1 = await surveySectionFactory({ company, team, survey });
        const surveySection2 = await surveySectionFactory({ company, team, survey });
        const surveyItem = await surveyItemFactory({
          company,
          team,
          survey,
          surveySection: surveySection1
        });
        await surveyItem.softDelete();

        expect(surveyItem.inTrash).to.be.eq(true);

        // remove first section
        await surveySection1.remove();

        const trash = await Trash.model.findOne({ surveyItem });
        await trash.restore();

        const surveyItemReload = await SurveyItem.model.findById(surveyItem._id);
        const trashReload = await Trash.model.findById(trash._id);

        // relation is updated
        expect(surveyItemReload.surveySection.toString()).to.be.eq(surveySection2._id.toString());
        expect(surveyItemReload.inTrash).to.be.eq(false);
        expect(trashReload).to.be.eq(null);
      });

      it('should raise error if survey have no sections now', async () => {
        const survey = await surveyFactory({ company, team });
        const surveySection1 = await surveySectionFactory({ company, team, survey });
        const surveyItem = await surveyItemFactory({
          company,
          team,
          survey,
          surveySection: surveySection1
        });
        await surveyItem.softDelete();

        expect(surveyItem.inTrash).to.be.eq(true);

        // remove first section
        await surveySection1.remove();

        const trash = await Trash.model.findOne({ surveyItem });

        try {
          await trash.restore();
        } catch (e) {
          expect(e.errors.surveySection.message).to.be.eq('Need to have section to restore');
        }
      });
    });
  });
});
