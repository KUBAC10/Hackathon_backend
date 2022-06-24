import request from 'supertest';
import httpStatus from 'http-status';
import chai, { expect } from 'chai';
import app from 'index';
import faker from 'faker';
import _ from 'lodash';

// helpers
import cleanData from 'server/tests/testHelpers/cleanData';

// factories
import {
  clientFactory,
  companyFactory,
  surveyFactory,
  questionFactory,
  surveyItemFactory,
  surveySectionFactory,
  questionItemFactory,
  teamFactory
} from 'server/tests/factories';

// models
import { Invite } from 'server/models';

// config
import config from '../../../../../../config/env';

chai.config.includeStack = true;

let token;
const link = `${config.hostname}/survey?token=`;
let team;
let survey;
let company;
let questionLinearScale;
let questionThumbs;
let questionNetPromoterScore;
let questionDropdown;
let questionMultipleChoice;
let questionCheckboxes;
let questionText;
let surveyItemLinearScale;
let surveyItemThumbs;
let surveyItemNetPromoterScore;
let surveyItemDropdown;
let surveyItemMultipleChoice;
let surveyItemCheckboxes;
let surveyItemText;
let invitations;

const clientId = 'abcd123';
const clientSecret = 'foobar';
const createInvitations = count => _.times(count, index =>
  ({ email: faker.internet.email() + index, meta: { userId: 'user1' }, ttl: 9000 })
);

async function makeTestData() {
  [
    team,
    company
  ] = await Promise.all([
    teamFactory({}),
    companyFactory({}),
  ]);

  [
    survey,
    questionLinearScale,
    questionThumbs,
    questionNetPromoterScore,
    questionDropdown,
    questionMultipleChoice,
    questionCheckboxes,
    questionText
  ] = await Promise.all([
    surveyFactory({ company, team }),
    questionFactory({ type: 'linearScale', from: 1, to: 5, icon: 'smiley', company, team }),
    questionFactory({ type: 'thumbs', company, team }),
    questionFactory({ type: 'netPromoterScore', company, team }),
    questionFactory({ type: 'dropdown', company, team }),
    questionFactory({ type: 'multipleChoice', company, team }),
    questionFactory({ type: 'checkboxes', company, team }),
    questionFactory({ type: 'text', company, team })
  ]);

  const surveySection = await surveySectionFactory({ survey });

  [
    surveyItemLinearScale,
    surveyItemThumbs,
    surveyItemNetPromoterScore,
    surveyItemDropdown,
    surveyItemMultipleChoice,
    surveyItemCheckboxes,
    surveyItemText
  ] = await Promise.all([
    surveyItemFactory({ question: questionLinearScale, survey, surveySection, company }),
    surveyItemFactory({ question: questionThumbs, survey, surveySection, company }),
    surveyItemFactory({ question: questionNetPromoterScore, survey, surveySection, company }),
    surveyItemFactory({ question: questionDropdown, survey, surveySection, company }),
    surveyItemFactory({ question: questionMultipleChoice, survey, surveySection, company }),
    surveyItemFactory({ question: questionCheckboxes, survey, surveySection, company }),
    surveyItemFactory({ question: questionText, survey, surveySection, company })
  ]);

  await clientFactory({ clientId, clientSecret, company });

  await questionItemFactory();
}

describe('## POST /api/v2/survey-items/:id/generate-links', () => {
  before(cleanData);

  before(makeTestData);

  describe('Authorized', () => {
    before(async () => {
      const res = await request(app)
        .post('/oauth/token')
        .send({ grant_type: 'client_credentials' })
        .auth('abcd123', 'foobar');
      token = res.body.access_token;
    });

    it('should create invitations with ttl', async () => {
      invitations = createInvitations(4);

      await request(app)
        .post(`/api/v2/survey-items/${surveyItemLinearScale._id}/generate-links`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          invitations
        })
        .expect(httpStatus.OK);

      const surveyInvitations = await Invite.model
        .find({ email: { $in: invitations.map(i => i.email) } });

      expect(surveyInvitations.length).to.be.eq(4);
      surveyInvitations.forEach((sI) => {
        expect(sI.ttl).to.be.eq(9000);
      });
    });

    it('should create invitations with global ttl', async () => {
      invitations = createInvitations(4).map(i => ({ ...i, ttl: undefined }));

      await request(app)
        .post(`/api/v2/survey-items/${surveyItemLinearScale._id}/generate-links`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          invitations,
          ttl: 1000
        })
        .expect(httpStatus.OK);

      const surveyInvitations = await Invite.model
        .find({ email: { $in: invitations.map(i => i.email) } });

      expect(surveyInvitations.length).to.be.eq(4);
      surveyInvitations.forEach((sI) => {
        expect(sI.ttl).to.be.eq(1000);
      });
    });

    it('should create valid links for linear scale', async () => {
      invitations = createInvitations(4);

      const res = await request(app)
        .post(`/api/v2/survey-items/${surveyItemLinearScale._id}/generate-links`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          invitations
        })
        .expect(httpStatus.OK);

      const result = res.body;

      const { _id } = surveyItemLinearScale;

      expect(result).to.be.an('array');
      expect(result.length).to.be.eq(4);

      const reloadInvitations = await Invite.model
        .find({ email: { $in: invitations.map(i => i.email) } });

      reloadInvitations.forEach((invitation) => {
        const { token } = invitation;

        const item = result.find(r => r.email.toLowerCase() === invitation.email);

        expect(item).to.be.an('object');
        expect(item.links.length).to.be.eq(5);

        item.links.forEach((item, index) => {
          expect(item).to.be.eq(`${link}${token}&surveyItem=${_id}&value=${index + 1}`);
        });
      });
    });

    it('should create valid links for thumbs', async () => {
      invitations = createInvitations(5);

      const res = await request(app)
        .post(`/api/v2/survey-items/${surveyItemThumbs._id}/generate-links`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          invitations
        })
        .expect(httpStatus.OK);

      const result = res.body;

      const { _id } = surveyItemThumbs;

      expect(result).to.be.an('array');
      expect(result.length).to.be.eq(5);

      const reloadInvitations = await Invite.model
        .find({ email: { $in: invitations.map(i => i.email) } });

      reloadInvitations.forEach((invitation) => {
        const { token } = invitation;

        const item = result.find(r => r.email.toLowerCase() === invitation.email);

        expect(item).to.be.an('object');
        expect(item.links.length).to.be.eq(2);

        item.links.forEach((item, index) => {
          expect(item).to.be.eq(`${link}${token}&surveyItem=${_id}&value=${['yes', 'no'][index]}`);
        });
      });
    });

    it('should create valid links for NPS', async () => {
      invitations = createInvitations(6);

      const res = await request(app)
        .post(`/api/v2/survey-items/${surveyItemNetPromoterScore._id}/generate-links`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          invitations
        })
        .expect(httpStatus.OK);

      const result = res.body;

      const { _id } = surveyItemNetPromoterScore;

      expect(result).to.be.an('array');
      expect(result.length).to.be.eq(6);

      const reloadInvitations = await Invite.model
        .find({ email: { $in: invitations.map(i => i.email) } });

      reloadInvitations.forEach((invitation) => {
        const { token } = invitation;

        const item = result.find(r => r.email.toLowerCase() === invitation.email);

        expect(item).to.be.an('object');
        expect(item.links.length).to.be.eq(11);

        item.links.forEach((item, index) => {
          expect(item).to.be.eq(`${link}${token}&surveyItem=${_id}&value=${index}`);
        });
      });
    });

    it('should create valid links for multipleChoice', async () => {
      const items = await Promise.all([
        questionItemFactory({ question: questionMultipleChoice, company, team, sortableId: 1 }),
        questionItemFactory({ question: questionMultipleChoice, company, team, sortableId: 2 }),
        questionItemFactory({ question: questionMultipleChoice, company, team, sortableId: 3 })
      ]);

      invitations = createInvitations(6);

      const res = await request(app)
        .post(`/api/v2/survey-items/${surveyItemMultipleChoice._id}/generate-links`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          invitations
        })
        .expect(httpStatus.OK);

      const result = res.body;

      const { _id } = surveyItemMultipleChoice;

      expect(result).to.be.an('array');
      expect(result.length).to.be.eq(6);

      const reloadInvitations = await Invite.model
        .find({ email: { $in: invitations.map(i => i.email) } });

      reloadInvitations.forEach((invitation) => {
        const { token } = invitation;

        const item = result.find(r => r.email.toLowerCase() === invitation.email);

        expect(item).to.be.an('object');
        expect(item.links.length).to.be.eq(3);

        item.links.forEach((item, index) => {
          expect(item).to.be.eq(`${link}${token}&surveyItem=${_id}&value=${items[index]._id}`);
        });
      });
    });

    it('should create valid links for dropdown', async () => {
      const items = await Promise.all([
        questionItemFactory({ question: questionDropdown, company, team, sortableId: 1 }),
        questionItemFactory({ question: questionDropdown, company, team, sortableId: 2 }),
        questionItemFactory({ question: questionDropdown, company, team, sortableId: 3 })
      ]);

      invitations = createInvitations(6);

      const res = await request(app)
        .post(`/api/v2/survey-items/${surveyItemDropdown._id}/generate-links`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          invitations
        })
        .expect(httpStatus.OK);

      const result = res.body;

      const { _id } = surveyItemDropdown;

      expect(result).to.be.an('array');
      expect(result.length).to.be.eq(6);

      const reloadInvitations = await Invite.model
        .find({ email: { $in: invitations.map(i => i.email) } });

      reloadInvitations.forEach((invitation) => {
        const { token } = invitation;

        const item = result.find(r => r.email.toLowerCase() === invitation.email);

        expect(item).to.be.an('object');
        expect(item.links.length).to.be.eq(3);

        item.links.forEach((item, index) => {
          expect(item).to.be.eq(`${link}${token}&surveyItem=${_id}&value=${items[index]._id}`);
        });
      });
    });

    it('should create valid links for checkboxes', async () => {
      const items = await Promise.all([
        questionItemFactory({ question: questionCheckboxes, company, team, sortableId: 1 }),
        questionItemFactory({ question: questionCheckboxes, company, team, sortableId: 2 }),
        questionItemFactory({ question: questionCheckboxes, company, team, sortableId: 3 })
      ]);

      invitations = createInvitations(5);

      const res = await request(app)
        .post(`/api/v2/survey-items/${surveyItemCheckboxes._id}/generate-links`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          invitations
        })
        .expect(httpStatus.OK);

      const result = res.body;

      const { _id } = surveyItemCheckboxes;

      expect(result).to.be.an('array');
      expect(result.length).to.be.eq(5);

      const reloadInvitations = await Invite.model
        .find({ email: { $in: invitations.map(i => i.email) } });

      reloadInvitations.forEach((invitation) => {
        const { token } = invitation;
        const item = result.find(r => r.email.toLowerCase() === invitation.email);

        expect(item).to.be.an('object');
        expect(item.links.length).to.be.eq(3);

        item.links.forEach((item, index) => {
          expect(item).to.be.eq(`${link}${token}&surveyItem=${_id}&value=${items[index]._id}`);
        });
      });
    });

    it('should return error, if incorrect question type', async () => {
      await Promise.all([
        questionItemFactory({ question: questionText, company, team }),
        questionItemFactory({ question: questionText, company, team }),
        questionItemFactory({ question: questionText, company, team })
      ]);

      invitations = createInvitations(5);

      await request(app)
        .post(`/api/v2/survey-items/${surveyItemText._id}/generate-links`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          invitations
        })
        .expect(httpStatus.BAD_REQUEST);
    });

    it('should create correct amount of invitations', async () => {
      invitations = createInvitations(200);

      const countBefore = await Invite.model.find().countDocuments();

      await request(app)
        .post(`/api/v2/survey-items/${surveyItemLinearScale._id}/generate-links`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          invitations
        })
        .expect(httpStatus.OK);

      const countAfter = await Invite.model.find().countDocuments();

      expect(countAfter).to.be.eq(countBefore + 200);
    });

    it('should return error if meta not valid', async () => {
      const invalidMeta = { userId: 'evm23md34f499jjs', email: 'example@email.com', obj: {} };

      const invalidInvitations = [
        ...createInvitations(5),
        { meta: invalidMeta, email: faker.internet.email() },
      ];

      const res = await request(app)
        .post(`/api/v2/survey-items/${surveyItemLinearScale._id}/generate-links`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          invitations: invalidInvitations
        })
        .expect(httpStatus.BAD_REQUEST);

      expect(res.body.message.meta.message).to.be.eq('Invalid type of value, allowed values: \'string\', \'number\', \'boolean\'.');
    });

    it('should reject with error not found', async () => {
      await request(app)
        .post(`/api/v2/survey-items/${survey._id}/generate-links`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          invitations
        })
        .expect(httpStatus.NOT_FOUND);
    });

    it('should return bad request if survey item without question', async () => {
      const surveyItem = await surveyItemFactory({ question: survey, survey, company });

      const res = await request(app)
        .post(`/api/v2/survey-items/${surveyItem._id}/generate-links`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          invitations: createInvitations(4)
        })
        .expect(httpStatus.BAD_REQUEST);

      expect(res.body.error).to.be.eq('Error: Survey item don\'t have a question');
    });
  });

  describe('Non authorized', () => {
    it('should return error for non authorized request', async () => {
      await request(app)
        .post(`/api/v2/survey-items/${surveyItemLinearScale._id}/generate-links`)
        .send({
          invitations
        })
        .expect(httpStatus.UNAUTHORIZED);
    });
  });
});
