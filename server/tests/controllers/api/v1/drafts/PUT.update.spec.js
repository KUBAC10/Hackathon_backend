import request from 'supertest';
import httpStatus from 'http-status';
import moment from 'moment';
import { expect } from 'chai';
import app from 'index';

// helpers
import cleanData from 'server/tests/testHelpers/cleanData';

// factories
import {
  companyFactory,
  surveyFactory,
  teamFactory,
  teamUserFactory,
  userFactory,
  surveyCampaignFactory,
  targetFactory
} from '../../../../factories';

const password = 'qwe123qwe';
const email = 'poweser@email.com';
const email2 = 'teamusser@email.com';
const oldStartDate = moment().toISOString();
const oldEndDate = moment().add(1, 'day').toISOString();
const newStartDate = moment().add(1, 'months').toISOString();
const newEndDate = moment().add(2, 'months').toISOString();
const oldAttributes = {
  defaultLanguage: 'en',
  inDraft: true,
  translation: { en: false },
  surveyType: 'quiz',
  name: { en: 'OldName' },
  description: { en: 'OldDescription' },
  translationLockName: { en: false },
  translationLockDescription: { en: false },
  startDate: oldStartDate,
  endDate: oldEndDate,
  references: {
    active: false,
    content: { en: 'OldContent' }
  },
  footer: {
    text: { en: 'OldText' },
    align: 'left',
    active: false,
    html: false,
    content: { en: 'OldContent' }
  },
  publicAccess: false,
  publicTTL: 1,
  publicTTLView: '60000',
  urlName: 'oldUrl',
  active: true,
  allowReAnswer: true
};
const newAttributes = {
  translation: { en: true },
  surveyType: 'survey',
  name: { en: 'NewName' },
  description: { en: 'NewDescription' },
  translationLockName: { en: true },
  translationLockDescription: { en: true },
  startDate: newStartDate,
  endDate: newEndDate,
  references: {
    active: true,
    content: { en: 'NewContent' }
  },
  footer: {
    text: { en: 'NewText' },
    align: 'center',
    active: true,
    html: true,
    content: { en: 'NewContent' }
  },
  endPage: {
    text: { en: 'NewText' },
    align: 'center',
    active: true,
    html: true,
    content: { en: 'NewContent' }
  },
  publicAccess: true,
  publicTTL: 100,
  publicTTLView: '60000',
  urlName: 'newUrl',
  active: true,
  allowReAnswer: true
};

let company;
let team;

async function makeTestData() {
  // create company
  company = await companyFactory({});
  team = await teamFactory({ company });

  oldAttributes.company = company._id;
  oldAttributes.team = team._id;

  // create users
  let user = await userFactory({ email, password, currentTeam: team, company, isPowerUser: true });
  await teamUserFactory({ user, team, company });

  // create Team user
  user = await userFactory({ email: email2, password, company, currentTeam: team });
  await teamUserFactory({ user, team, company });
}

describe('## PUT /api/v1/drafts', () => {
  before(cleanData);

  before(makeTestData);

  describe('Authorized', () => {
    describe('As Power User', () => {
      const agent = request.agent(app);
      before(async () => {
        await agent
          .post('/api/v1/authentication')
          .send({
            password,
            login: email
          });
      });

      it('should update survey attributes', async () => {
        const survey = await surveyFactory({
          team,
          company,
          draftData: oldAttributes
        });

        const res = await agent
          .put(`/api/v1/drafts/${survey._id}`)
          .send(newAttributes)
          .expect(httpStatus.OK);

        const {
          translation,
          surveyType,
          name,
          description,
          translationLockName,
          translationLockDescription,
          startDate,
          endDate,
          references,
          footer,
          publicAccess,
          publicTTL,
          publicTTLView,
          urlName,
          active,
          allowReAnswer
        } = res.body;

        expect(translation.en).to.be.eq(true);
        expect(surveyType).to.be.eq('survey');
        expect(name.en).to.be.eq('NewName');
        expect(description.en).to.be.eq('NewDescription');
        expect(translationLockName.en).to.be.eq(true);
        expect(translationLockDescription.en).to.be.eq(true);
        expect(startDate).to.be.eq(newStartDate);
        expect(endDate).to.be.eq(newEndDate);
        expect(references.active).to.be.eq(true);
        expect(references.content.en).to.be.eq('NewContent');
        expect(footer.align).to.be.eq('center');
        expect(footer.active).to.be.eq(true);
        expect(footer.html).to.be.eq(true);
        expect(footer.content.en).to.be.eq('NewContent');
        expect(publicAccess).to.be.eq(true);
        expect(publicTTL).to.be.eq(100);
        expect(publicTTLView).to.be.eq('60000');
        expect(urlName).to.be.eq('newUrl');
        expect(active).to.be.eq(active);
        expect(allowReAnswer).to.be.eq(true);
      });

      it('should return message if url had been already taken', async () => {
        const [survey] = await Promise.all([
          surveyFactory({ company, team }),
          surveyFactory({ company, team, urlName: 'hello' })
        ]);

        const res = await agent
          .put(`/api/v1/drafts/${survey._id}`)
          .send({
            urlName: 'hello'
          })
          .expect(httpStatus.BAD_REQUEST);

        expect(res.body.urlName).to.be.eq('Had been already taken');
      });

      it('should not update single question setting if custom view enabled', async () => {
        const survey = await surveyFactory({
          team,
          company,
          displaySingleQuestion: true,
          customAnimation: true
        });

        const res = await agent
          .put(`/api/v1/drafts/${survey._id}`)
          .send({ displaySingleQuestion: false })
          .expect(httpStatus.OK);

        expect(res.body.displaySingleQuestion).to.be.eq(true);
        expect(res.body.draftData.displaySingleQuestion).to.be.eq(undefined);
      });

      it('should skip single question setting if custom view turn on', async () => {
        const survey = await surveyFactory({
          team,
          company,
          displaySingleQuestion: true
        });

        const res = await agent
          .put(`/api/v1/drafts/${survey._id}`)
          .send({
            displaySingleQuestion: false,
            customAnimation: true
          })
          .expect(httpStatus.OK);

        expect(res.body.displaySingleQuestion).to.be.eq(true);
        expect(res.body.draftData.displaySingleQuestion).to.be.eq(true);
        expect(res.body.draftData.customAnimation).to.be.eq(true);
      });

      it('should return error if survey hasn\'t exist', async () => {
        await agent
          .put(`/api/v1/drafts/${company._id}`)
          .send({
            urlName: 'hello'
          })
          .expect(httpStatus.NOT_FOUND);
      });

      it('should return error if user hasn\'t permission', async () => {
        const survey = await surveyFactory({});

        await agent
          .put(`/api/v1/drafts/${survey._id}`)
          .send({
            urlName: 'hello'
          })
          .expect(httpStatus.FORBIDDEN);
      });

      it('should switch from distribute to targets', async () => {
        const survey = await surveyFactory({ company, team });

        const res = await agent
          .put(`/api/v1/drafts/${survey._id}`)
          .send({ distributeByTargets: true })
          .expect(httpStatus.OK);

        expect(res.body.distributeByTargets).to.be.eq(true);
      });

      it('should not switch from distribute to targets', async () => {
        const survey = await surveyFactory({ company, team });

        await surveyCampaignFactory({ company, team, survey, status: 'active' });

        const res = await agent
          .put(`/api/v1/drafts/${survey._id}`)
          .send({ distributeByTargets: true })
          .expect(httpStatus.OK);

        expect(res.body.distributeByTargets).to.be.eq(false);
      });

      it('should switch from targets to distribute', async () => {
        const survey = await surveyFactory({ company, team });

        const res = await agent
          .put(`/api/v1/drafts/${survey._id}`)
          .send({ distributeByTargets: false })
          .expect(httpStatus.OK);

        expect(res.body.distributeByTargets).to.be.eq(false);
      });

      it('should not switch from targets to distribute', async () => {
        const survey = await surveyFactory({ company, team, distributeByTargets: true });

        const target = await targetFactory({ company, team, survey });

        await surveyCampaignFactory({ company, team, survey, status: 'active', target });

        const res = await agent
          .put(`/api/v1/drafts/${survey._id}`)
          .send({ distributeByTargets: false })
          .expect(httpStatus.OK);

        expect(res.body.distributeByTargets).to.be.eq(true);
      });
    });

    describe('As Team User', () => {
      const agent = request.agent(app);
      before(async () => {
        await agent
          .post('/api/v1/authentication')
          .send({
            password,
            login: email2
          });
      });


      it('should update survey attributes', async () => {
        const survey = await surveyFactory({
          team,
          company,
          draftData: oldAttributes
        });

        newAttributes.urlName = 'someUrl';

        const res = await agent
          .put(`/api/v1/drafts/${survey._id}`)
          .send(newAttributes)
          .expect(httpStatus.OK);

        const {
          translation,
          surveyType,
          name,
          description,
          translationLockName,
          translationLockDescription,
          startDate,
          endDate,
          references,
          footer,
          publicAccess,
          publicTTL,
          publicTTLView,
          urlName,
          active,
          allowReAnswer
        } = res.body;

        expect(translation.en).to.be.eq(true);
        expect(surveyType).to.be.eq('survey');
        expect(name.en).to.be.eq('NewName');
        expect(description.en).to.be.eq('NewDescription');
        expect(translationLockName.en).to.be.eq(true);
        expect(translationLockDescription.en).to.be.eq(true);
        expect(startDate).to.be.eq(newStartDate);
        expect(endDate).to.be.eq(newEndDate);
        expect(references.active).to.be.eq(true);
        expect(references.content.en).to.be.eq('NewContent');
        expect(footer.align).to.be.eq('center');
        expect(footer.active).to.be.eq(true);
        expect(footer.html).to.be.eq(true);
        expect(footer.content.en).to.be.eq('NewContent');
        expect(publicAccess).to.be.eq(true);
        expect(publicTTL).to.be.eq(100);
        expect(publicTTLView).to.be.eq('60000');
        expect(urlName).to.be.eq('someUrl');
        expect(active).to.be.eq(active);
        expect(allowReAnswer).to.be.eq(true);
      });

      it('should return error if survey hasn\'t exist', async () => {
        await agent
          .put(`/api/v1/drafts/${company._id}`)
          .send({
            urlName: 'hello'
          })
          .expect(httpStatus.NOT_FOUND);
      });

      it('should return error if user hasn\'t permission', async () => {
        const survey = await surveyFactory({});

        await agent
          .put(`/api/v1/drafts/${survey._id}`)
          .send({
            urlName: 'hello'
          })
          .expect(httpStatus.FORBIDDEN);
      });
    });
  });

  describe('Unauthorized', () => {
    it('should return Unauthorized stats', async () => {
      const survey = await surveyFactory({ team, company });

      await request.agent(app)
        .put(`/api/v1/drafts/${survey._id}`)
        .expect(httpStatus.UNAUTHORIZED);
    });
  });
});
