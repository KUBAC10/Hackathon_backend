import chai, { expect } from 'chai';
import app from 'index'; // eslint-disable-line

// helpers
import cleanData from '../testHelpers/cleanData';

// factories
import {
  companyFactory,
  surveyFactory,
  surveySectionFactory,
  teamFactory
} from '../factories/';

// models
import { SurveySection } from '../../models';


chai.config.includeStack = true;

let company;
let team;

async function makeTestData() {
  company = await companyFactory({});
  team = await teamFactory({ company });
}

describe('Handle Sortable Id', () => {
  before(cleanData);

  before(makeTestData);

  describe('Set New SortableId', () => {
    it('should set sortable id to new item', async () => {
      const survey = await surveyFactory({ company, team });

      await Promise.all([
        surveySectionFactory({ team, company, survey, sortableId: -1 }),
        surveySectionFactory({ team, company, survey, sortableId: 0 }),
        surveySectionFactory({ team, company, survey, sortableId: 1, draftRemove: true }),
        surveySectionFactory({ team, company, survey, sortableId: 2 })
      ]);

      const newSection = new SurveySection.model({ team, company, survey });

      newSection._addDefaultItem = true;

      await newSection.save();

      expect(newSection.draftData.sortableId).to.be.eq(3);
    });
  });

  describe('Add To Direct Position', () => {
    it('should set correct sortable id when add item on direct position', async () => {
      const survey = await surveyFactory({ company, team });

      await Promise.all([
        surveySectionFactory({ team, company, survey, sortableId: -1 }),
        surveySectionFactory({ team, company, survey, sortableId: 0 }),
        surveySectionFactory({ team, company, survey, sortableId: 1, draftRemove: true }),
        surveySectionFactory({ team, company, survey, sortableId: 2 }),
      ]);

      const newSection = new SurveySection.model({
        team,
        company,
        survey,
        draftData: { index: 1 }
      });

      newSection._addAfterDefined = true;

      await newSection.save();

      expect(newSection.draftData.sortableId).to.be.eq(0.5);
    });
  });

  describe('Move Item', () => {
    it('should set new sortable id for zero index', async () => {
      const survey = await surveyFactory({ company, team });

      const [surveySection] = await Promise.all([
        surveySectionFactory({ team, company, survey, draftData: { index: 0 } }),
        surveySectionFactory({ team, company, survey, sortableId: -1 }),
        surveySectionFactory({ team, company, survey, sortableId: 0 }),
        surveySectionFactory({ team, company, survey, sortableId: 1, draftRemove: true }),
        surveySectionFactory({ team, company, survey, sortableId: 2 }),
      ]);

      surveySection._moveItem = true;

      await surveySection.save();

      expect(surveySection.draftData.sortableId).to.be.eq(-2);
    });

    it('should set new sortable id when item move top', async () => {
      const survey = await surveyFactory({ company, team });

      const [surveySection] = await Promise.all([
        surveySectionFactory({
          team, company, survey, sortableId: 3, draftData: { index: 0 }
        }),
        surveySectionFactory({ team, company, survey, sortableId: -1 }),
        surveySectionFactory({ team, company, survey, sortableId: 0 }),
        surveySectionFactory({ team, company, survey, sortableId: 1, draftRemove: true }),
        surveySectionFactory({ team, company, survey, sortableId: 2 }),
      ]);

      surveySection._moveItem = true;

      await surveySection.save();

      expect(surveySection.draftData.sortableId).to.be.eq(-2);
    });

    it('should set new sortable id when item move down', async () => {
      const survey = await surveyFactory({ company, team });

      const [surveySection] = await Promise.all([
        surveySectionFactory({
          team, company, survey, sortableId: -2, draftData: { index: 2 }
        }),
        surveySectionFactory({ team, company, survey, sortableId: -1 }),
        surveySectionFactory({ team, company, survey, sortableId: 0 }),
        surveySectionFactory({ team, company, survey, sortableId: 1, draftRemove: true }),
        surveySectionFactory({ team, company, survey, sortableId: 2 }),
      ]);

      surveySection._moveItem = true;

      await surveySection.save();

      expect(surveySection.draftData.sortableId).to.be.eq(0.5);
    });

    it('should set new sortable id for last index', async () => {
      const survey = await surveyFactory({ company, team });

      const [surveySection] = await Promise.all([
        surveySectionFactory({ team, company, survey, draftData: { index: 3 } }),
        surveySectionFactory({ team, company, survey, sortableId: -1 }),
        surveySectionFactory({ team, company, survey, sortableId: 0 }),
        surveySectionFactory({ team, company, survey, sortableId: 1, draftRemove: true }),
        surveySectionFactory({ team, company, survey, sortableId: 2 }),
      ]);

      surveySection._moveItem = true;

      await surveySection.save();

      expect(surveySection.draftData.sortableId).to.be.eq(3);
    });
  });
});
