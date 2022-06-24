import chai, { expect } from 'chai';
import app from 'index'; // eslint-disable-line

// helpers
import cleanData from 'server/tests/testHelpers/cleanData';
import parseTpl from 'server/helpers/parse-es6-template';

// services
import APIMessagesExtractor from 'server/services/APIMessagesExtractor';

// models
import {
  Survey
} from 'server/models';

// factories
import {
  surveyFactory,
  contentFactory,
  surveySectionFactory,
  surveyItemFactory,
  questionFactory,
  teamFactory,
  companyFactory,
  userFactory,
} from 'server/tests/factories';

// attributes
import { attributes as surveyAttributes } from 'server/tests/factories/survey.factory';

chai.config.includeStack = true;

let attrs;
let content;

async function makeTestData() {
  [
    attrs,
    content,
  ] = await Promise.all([
    surveyAttributes({}, true),
    contentFactory({}),
    surveyFactory({}),
  ]);

  await APIMessagesExtractor.loadData();
}

describe('Survey Model', () => {
  before(cleanData);

  before(makeTestData);

  describe('Pre save', () => {
    it('should clear urlName when private access was updated to private', async () => {
      const publicSurvey = await surveyFactory({ publicAccess: true });
      expect(publicSurvey.urlName).to.be.an('string');

      publicSurvey.publicAccess = false;
      await publicSurvey.save();
      expect(publicSurvey.urlName).to.be.eq(undefined);
    });

    it('should clear footer text if fields footer is disable', async () => {
      const survey = new Survey.model({
        ...attrs,
        draftData: {
          footer: {
            active: true,
            text: { en: 'Text', de: 'Text' }
          }
        }
      });
      await survey.save();
      const reloadSurvey = await Survey.model.findOne(survey);
      reloadSurvey.draftData.footer.active = false;
      reloadSurvey.markModified('draftData.footer.active');
      await reloadSurvey.save();
      expect(reloadSurvey.draftData.footer.text.en).to.be.eq(undefined);
      expect(reloadSurvey.draftData.footer.text.de).to.be.eq(undefined);
    });

    it('should return error when urlName not presence for public survey', async () => {
      try {
        const survey = new Survey.model({ ...attrs });
        survey.urlName = undefined;
        survey.publicAccess = true;

        await survey.save();
      } catch (e) {
        expect(e.errors.urlName.message).to.be.eq(content.apiErrors.global.isRequired);
      }
    });

    it('should return error for wrong start/end date', async () => {
      // TODO rewrite tests and logic?
      // try {
      //   const survey = new Survey.model({ ...attrs });
      //   survey.startDate = moment().add(5, 'days');
      //   survey.endDate = moment().subtract(5, 'days');
      //
      //   await survey.save();
      // } catch (e) {
      //   expect(e.errors.endDate.message).to.be.eq(content.apiErrors.survey.invalidDate);
      // }
    });
  });

  describe('Post save', () => {
    it('should return error if urlName already exists', async () => {
      let surveyRepeatUrl;
      try {
        const survey = new Survey.model({ ...attrs });
        surveyRepeatUrl = new Survey.model({ ...attrs });

        await survey.save();
        await surveyRepeatUrl.save();
      } catch (e) {
        expect(e.errors.urlName.message).to.be.eq(parseTpl(content.apiErrors.global.uniqueField, { field: 'urlName' }, ''));
        expect(await Survey.model.findById(surveyRepeatUrl)).to.be.eq(null);
      }
    });
  });

  describe('Instance Methods', () => {
    describe('.getClone', () => {
      let survey;
      let user;
      let surveySections;
      let surveyItems;
      let questions;

      before(async () => {
        const company = await companyFactory({});
        const team = await teamFactory({ company });

        // create user
        user = await userFactory({});
        user = { _id: user._id, companyId: company._id, currentTeam: team._id };

        // create survey
        survey = await surveyFactory({ team, company });

        // create survey sections
        const [
          surveySection1,
          surveySection2,
          surveySection3
        ] = await Promise.all([
          surveySectionFactory({ survey, sortableId: 0, team, company }),
          surveySectionFactory({ survey, sortableId: 1, team, company }),
          surveySectionFactory({ survey, sortableId: 2, team, company })
        ]);
        surveySections = [
          surveySection1._id.toString(),
          surveySection2._id.toString(),
          surveySection3._id.toString()
        ];

        // create question
        const [
          question1,
          question2,
          question3
        ] = await Promise.all([
          questionFactory({ team, company }),
          questionFactory({ team, company }),
          questionFactory({ team, company })
        ]);
        questions = [
          question1._id.toString(),
          question2._id.toString(),
          question3._id.toString()
        ];

        // create survey items
        const [
          surveyItem1,
          surveyItem2,
          surveyItem3
        ] = await Promise.all([
          surveyItemFactory({
            survey, surveySection: surveySection1, question: question1, team, company
          }),
          surveyItemFactory({
            survey, surveySection: surveySection2, question: question2, team, company
          }),
          surveyItemFactory({
            survey, surveySection: surveySection3, question: question3, team, company
          })
        ]);
        surveyItems = [
          surveyItem1._id.toString(),
          surveyItem2._id.toString(),
          surveyItem3._id.toString()
        ];
      });

      it('should create template from survey', async () => {
        const cloneId = await survey.getClone({ type: 'template', user });
        const template = await Survey.model
          .findOne({ _id: cloneId })
          .populate([
            {
              path: 'surveySections',
              populate: [
                {
                  path: 'surveyItems'
                }
              ]
            }
          ])
          .lean();

        // expect reloaded survey template
        expect(template.name.en).to.be.eq(`${survey.name.en}`);
        expect(template.type).to.be.eq('template');
        expect(template.surveySections).to.be.an('array');
        expect(template.surveySections.length).to.be.eq(3);
        expect(template.createdBy.toString()).to.be.eq(user._id.toString());

        // expect surveySections
        template.surveySections.forEach((section) => {
          expect(surveySections.includes(section._id.toString)).to.be.eq(false);
          expect(section.surveyItems).to.be.an('array');
          expect(section.surveyItems.length).to.be.eq(1);
          expect(surveyItems.includes(section.surveyItems[0]._id.toString())).to.be.eq(false);
          expect(questions.includes(section.surveyItems[0].question._id.toString())).to.be
            .eq(false);
        });
      });
    });
  });
});
