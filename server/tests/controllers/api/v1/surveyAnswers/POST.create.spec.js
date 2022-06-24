import request from 'supertest';
import uuid from 'uuid/v4';
import httpStatus from 'http-status';
import chai, { expect } from 'chai';
import app from 'index';
import moment from 'moment';

// models
import { SurveyResult } from 'server/models';

// helpers
import cleanData from 'server/tests/testHelpers/cleanData';

// services
import { APIMessagesExtractor } from 'server/services';

// factories
import {
  surveyFactory,
  companyFactory,
  teamFactory,
  surveyResultFactory,
  contactFactory,
  inviteFactory,
  contentFactory,
  assetFactory,
  surveySectionFactory,
  surveyItemFactory,
  questionFactory,
  userFactory,
  teamUserFactory,
  targetFactory
} from '../../../../factories';

chai.config.includeStack = true;

let team;
let company;
let contact;

let token1;
let token2;
let token3;
let tokenWithoutInvite;

let survey;
let survey1;
let survey2;
let publicSurvey;
let surveyItem;
let question;

let content;

async function makeTestData() {
  // create company and team
  company = await companyFactory({ urlName: 'company' });
  team = await teamFactory({ company });

  [
    survey,
    survey1,
    survey2,
    publicSurvey,
  ] = await Promise.all([
    surveyFactory({ team }),
    surveyFactory({ team }),
    surveyFactory({ team }),
    surveyFactory({ team, urlName: 'test', publicAccess: true }),
  ]);

  const surveySection = await surveySectionFactory({ survey, sortableId: 0 });
  await surveySectionFactory({ survey, sortableId: 1 });
  question = await questionFactory({ type: 'linearScale', linearScale: { icon: 'smiley' } });
  surveyItem = await surveyItemFactory({ surveySection, survey, question });

  // create contact
  contact = await contactFactory({ company });

  token1 = uuid();
  token2 = uuid();
  tokenWithoutInvite = uuid();

  await Promise.all([
    inviteFactory({ token: token1, survey: survey1, contact }),
    inviteFactory({ token: token2, survey: survey2, contact }),
    inviteFactory({ token: token3, survey: publicSurvey, contact })
  ]);

  await Promise.all([
    // create existing survey result for survey2
    surveyResultFactory({ survey: survey2, contact, token: token2 }),
    // create existing survey result for surveyUrl
    surveyResultFactory({ survey: publicSurvey, fingerprintId: 'testId' })
  ]);

  // load content
  content = await contentFactory({});
  await APIMessagesExtractor.loadData();
}

describe('## POST /api/v1/survey-answers', () => {
  before(cleanData);

  before(makeTestData);

  describe('By token', () => {
    it('should return error for token without existing invite', async () => {
      await request(app)
        .post('/api/v1/survey-answers')
        .send({
          token: tokenWithoutInvite,
        })
        .expect(httpStatus.NOT_FOUND);
    });

    // TODO add better tests check ttl!!!
    it('should return message for invite with expired ttl', async () => {
      const tokenTll = uuid();
      const inviteExpired = await inviteFactory({ token: tokenTll, survey: survey1, ttl: 1000 });
      await inviteExpired.update({ createdAt: moment().subtract(1, 'day') });
      const res = await request(app)
        .post('/api/v1/survey-answers')
        .send({
          token: tokenTll,
        })
        .expect(httpStatus.OK);

      expect(res.body.isExpired).to.be.eq(true);
      expect(res.body.message).to.be.eq(content.apiMessages.invite.isExpired);
    });

    it('should create result for invite with valid ttl', async () => {
      const tokenTll = uuid();
      await inviteFactory({ token: tokenTll, survey: survey1, ttl: 10000 });
      await request(app)
        .post('/api/v1/survey-answers')
        .send({
          token: tokenTll,
        })
        .expect(httpStatus.OK);
    });

    it('should create result for invite with target', async () => {
      const token = uuid();

      const survey = await surveyFactory({ company, team });

      const target = await targetFactory({ team, company, survey });

      await inviteFactory({ token, survey, target });

      const res = await request(app)
        .post('/api/v1/survey-answers')
        .send({ token })
        .expect(httpStatus.OK);

      const surveyResult = await SurveyResult.model
        .findOne({ _id: res.body._id })
        .lean();

      expect(surveyResult.target.toString()).to.be.eq(target._id.toString());
    });

    it('should return existing survey result if it was present', async () => {
      await request(app)
        .post('/api/v1/survey-answers')
        .send({
          token: token2,
        })
        .expect(httpStatus.OK);
    });

    it('should create new survey result by request user for given survey', async () => {
      const res = await request(app)
        .post('/api/v1/survey-answers')
        .send({
          token: token1,
        })
        .expect(httpStatus.OK);

      const newSurveyResult = await SurveyResult.model
        .findOne({ token: token1 });

      expect(newSurveyResult).to.be.an('object');
      expect(newSurveyResult.empty).to.be.eq(true);
      expect(res.body._id).to.be.eq(newSurveyResult._id.toString());
    });

    it('should return message when survey was expired', async () => {
      const token = uuid();
      const survey = await surveyFactory({
        startDate: moment().subtract(10, 'days'),
        endDate: moment()
      });

      await inviteFactory({ survey, token, contact });

      const res = await request(app)
        .post('/api/v1/survey-answers')
        .send({
          token
        })
        .expect(httpStatus.OK);

      expect(res.body.message).to.be.eq(content.apiMessages.survey.expired);
    });

    it('should return message survey not started', async () => {
      const token = uuid();
      const survey = await surveyFactory({
        startDate: moment().subtract(-10, 'days'),
        endDate: moment().subtract(-20, 'days')
      });
      await inviteFactory({ survey, token, contact });
      const res = await request(app)
        .post('/api/v1/survey-answers')
        .send({
          token
        })
        .expect(httpStatus.OK);

      expect(res.body.message).to.be.eq(content.apiMessages.survey.notStarted);
    });

    describe('Process with assets', () => {
      let token;
      let survey;
      let asset1;
      let asset2;

      before(async () => {
        token = uuid();
        [survey, asset1, asset2] = await Promise.all([
          surveyFactory({}),
          assetFactory({}),
          assetFactory({})
        ]);

        // create invite
        await inviteFactory({ survey, token, contact });
      });

      it('should create survey result with given assets', async () => {
        const res = await request(app)
          .post('/api/v1/survey-answers')
          .send({
            token,
            assets: [asset1._id.toString(), asset2._id.toString()]
          })
          .expect(httpStatus.OK);

        const surveyResult = await SurveyResult.model
          .findOne({ token, assets: { $in: [asset1._id.toString(), asset2._id.toString()] } })
          .lean();

        expect(surveyResult).to.be.an('object');
        expect(res.body._id).to.be.eq(surveyResult._id.toString());
      });
    });

    describe('Process with invite meta data', () => {
      it('should create survey result with meta', async () => {
        const token = uuid();
        const meta = { userId: 'evm23md34f499jjs', email: 'example@email.com' };
        await inviteFactory({ survey, token, contact, meta });
        const res = await request(app)
          .post('/api/v1/survey-answers')
          .send({
            token
          })
          .expect(httpStatus.OK);

        // reload and expect surveyResult
        const reloadSurveyResult = await SurveyResult.model
          .findOne({ token })
          .lean();
        expect(reloadSurveyResult).to.be.an('object');
        expect(reloadSurveyResult.meta).to.deep.eq({
          userId: 'evm23md34f499jjs',
          email: 'example@email.com'
        });

        expect(res.body._id).to.be.eq(reloadSurveyResult._id.toString());
      });
    });

    it('should create survey result with answer and meta', async () => {
      const token = uuid();
      const meta = { userId: 'evm23md34f499jjs', email: 'example@email.com' };
      await inviteFactory({ survey, token, contact });
      const res = await request(app)
        .post('/api/v1/survey-answers')
        .send({
          token,
          meta,
          answer: { [surveyItem._id.toString()]: '2' }
        })
        .expect(httpStatus.OK);

      // expect survey result
      const reloadSurveyResult = await SurveyResult.model
        .findOne({ token })
        .lean();

      expect(reloadSurveyResult.answer).to.be.an('object');
      expect(reloadSurveyResult.answer[surveyItem._id].value).to.be.eq(2);
      expect(res.body._id).to.be.eq(reloadSurveyResult._id.toString());
    });

    it('should create survey result with answer end empty false flag', async () => {
      const token = uuid();
      await inviteFactory({ survey, token, contact });
      const res = await request(app)
        .post('/api/v1/survey-answers')
        .send({
          token,
          answer: { [surveyItem._id.toString()]: '2' }
        })
        .expect(httpStatus.OK);

      // reload surveyResult
      const surveyResult = await SurveyResult.model.findOne({ token }).select('empty').lean();

      // expect survey result
      expect(surveyResult.empty).to.be.eq(false);
      expect(res.body._id).to.be.eq(surveyResult._id.toString());
    });

    it('should create survey result with empty true flag', async () => {
      const token = uuid();
      await inviteFactory({ survey, token, contact });
      const res = await request(app)
        .post('/api/v1/survey-answers')
        .send({ token })
        .expect(httpStatus.OK);

      // reload surveyResult
      const surveyResult = await SurveyResult.model.findOne({ token }).select('empty').lean();

      // expect survey result
      expect(surveyResult.empty).to.be.eq(true);
      expect(res.body._id).to.be.eq(surveyResult._id.toString());
    });

    it('should not create survey result item with answer on invalid answer', async () => {
      const token = uuid();
      const meta = { userId: 'evm23md34f499jjs', email: 'example@email.com' };
      await inviteFactory({ survey, token, contact });
      const res = await request(app)
        .post('/api/v1/survey-answers')
        .send({
          token,
          meta,
          answer: { [survey._id.toString()]: '2' }
        })
        .expect(httpStatus.OK);

      // expect survey result item
      const result = await SurveyResult.model
        .findOne({ token })
        .lean();

      expect(result.answer).to.be.an('undefined');
      expect(res.body._id).to.be.eq(result._id.toString());
    });

    it('should return survey result id and check publicTTL', async () => {
      const token = uuid();

      const survey = await surveyFactory({ team, publicTTL: 100 });

      await inviteFactory({ survey, token });

      const surveyResult = await surveyResultFactory({ survey, token });

      const res = await request(app)
        .post('/api/v1/survey-answers')
        .send({ token })
        .expect(httpStatus.OK);

      expect(res.body._id).to.be.eq(surveyResult._id.toString());
    });

    it('should count quiz total for for new survey result', async () => {
      const token = uuid();

      const survey = await surveyFactory({ team, surveyType: 'quiz' });

      await inviteFactory({ survey, token });

      const res = await request(app)
        .post('/api/v1/survey-answers')
        .send({ token })
        .expect(httpStatus.OK);

      expect(res.body._id).to.be.an('string');

      const surveyResult = await SurveyResult.model
        .findById(res.body._id)
        .lean();

      expect(surveyResult).to.be.an('object');
      expect(surveyResult.quizTotal).to.be.eq(0);
    });
  });

  describe('By Fingerprint ID', () => {
    it('should return error for wrong surveyId', async () => {
      await request(app)
        .post('/api/v1/survey-answers')
        .send({
          surveyId: company._id.toString(),
          fingerprintId: 'testId',
        })
        .expect(httpStatus.NOT_FOUND);
    });

    it('should create new survey result when survey was not found by fingerprintId', async () => {
      const res = await request(app)
        .post('/api/v1/survey-answers')
        .send({
          surveyId: publicSurvey._id.toString(),
          fingerprintId: '123',
        })
        .expect(httpStatus.OK);

      // reload surveyResult
      const surveyResult = await SurveyResult.model.findOne({ fingerprintId: '123' }).select('empty').lean();

      // expect survey result
      expect(surveyResult.empty).to.be.eq(true);

      expect(res.body._id).to.be.eq(surveyResult._id.toString());
    });

    it('should return existing survey result by given params', async () => {
      await request(app)
        .post('/api/v1/survey-answers')
        .send({
          surveyId: publicSurvey._id.toString(),
          fingerprintId: 'testId',
        })
        .expect(httpStatus.OK);
    });

    it('should return message when survey was expired', async () => {
      const survey = await surveyFactory({
        startDate: moment().subtract(10, 'days'),
        endDate: moment(),
        publicAccess: true
      });

      const res = await request(app)
        .post('/api/v1/survey-answers')
        .send({
          surveyId: survey._id.toString(),
          fingerprintId: 'fingerprintId2'
        })
        .expect(httpStatus.OK);

      expect(res.body.message).to.be.eq(content.apiMessages.survey.expired);
    });

    it('should return message survey not started', async () => {
      const survey = await surveyFactory({
        startDate: moment().subtract(-10, 'days'),
        endDate: moment().subtract(-20, 'days'),
        publicAccess: true
      });

      const res = await request(app)
        .post('/api/v1/survey-answers')
        .send({
          surveyId: survey._id.toString(),
          fingerprintId: 'fingerprintId1'
        })
        .expect(httpStatus.OK);

      expect(res.body.message).to.be.eq(content.apiMessages.survey.notStarted);
    });

    it('should answer by token on public survey', async () => {
      const token = uuid();
      await inviteFactory({ token, survey: publicSurvey });

      await request(app)
        .post('/api/v1/survey-answers')
        .send({
          token
        })
        .expect(httpStatus.OK);
    });

    it('should init survey result with meta', async () => {
      const meta = { data: 'data' };
      const res = await request(app)
        .post('/api/v1/survey-answers')
        .send({
          meta,
          surveyId: publicSurvey._id.toString(),
          fingerprintId: 'withMeta',
        })
        .expect(httpStatus.OK);

      // reload survey result to expect meta data
      const reloadedSurveyResult = await SurveyResult.model
        .findOne({ fingerprintId: 'withMeta' })
        .select('meta')
        .lean();
      // expect
      expect(reloadedSurveyResult.meta).to.deep.equal(meta);

      expect(res.body._id).to.be.eq(reloadedSurveyResult._id.toString());
    });

    it('should auto complete survey result on empty survey', async () => {
      const survey = await surveyFactory({});

      const res = await request(app)
        .post('/api/v1/survey-answers')
        .send({
          surveyId: survey._id.toString(),
          fingerprintId: 'emptySurvey',
        })
        .expect(httpStatus.OK);

      // reload survey result to expect meta data
      const result = await SurveyResult.model
        .findOne({ fingerprintId: 'emptySurvey' })
        .select('completed')
        .lean();

      expect(result.completed).to.be.eq(true);
      expect(res.body._id).to.be.eq(result._id.toString());
    });

    describe('Process with assets', () => {
      let survey;
      let asset1;
      let asset2;

      before(async () => {
        [survey, asset1, asset2] = await Promise.all([
          surveyFactory({ publicAccess: true }),
          assetFactory({}),
          assetFactory({})
        ]);
      });

      it('should create survey result with given assets', async () => {
        const res = await request(app)
          .post('/api/v1/survey-answers')
          .send({
            surveyId: survey._id.toString(),
            fingerprintId: 'fingerprintId1',
            assets: [asset1._id.toString(), asset2._id.toString()]
          })
          .expect(httpStatus.OK);

        const surveyResult = await SurveyResult.model
          .findOne({
            survey: survey._id.toString(),
            assets: { $in: [asset1._id.toString(), asset2._id.toString()] }
          })
          .lean();

        expect(surveyResult).to.be.an('object');

        expect(res.body._id).to.be.eq(surveyResult._id.toString());
      });
    });
  });

  describe('By Preview token', () => {
    const email = 'example@email.com';
    const email2 = 'example2@email.com';
    const password = 'password';

    let survey;
    let teamUser;
    let company;
    let team;

    before(async () => {
      // create company and team
      company = await companyFactory();
      team = await teamFactory({ company });
      // user
      await userFactory({ team, company });
      survey = await surveyFactory({ team, company });
      const section = await surveySectionFactory({ survey, sortableId: 0 });
      await surveyItemFactory({ survey, surveySection: section });
      await surveyItemFactory({ survey, surveySection: section });

      // create power User
      await userFactory({ email, password, company, currentTeam: team, isPowerUser: true });

      // create Team user
      teamUser = await userFactory({ email: email2, password, company, currentTeam: team });
      await teamUserFactory({ user: teamUser, team, company });
    });

    describe('As power user', () => {
      const agent = request.agent(app);
      before(async () => {
        await agent
          .post('/api/v1/authentication')
          .send({
            login: email,
            password
          });
      });

      it('should create survey result', async () => {
        const token = uuid();
        await inviteFactory({ survey, token, company, type: 'company', preview: true });

        const res = await agent
          .post('/api/v1/survey-answers')
          .send({ token })
          .expect(httpStatus.OK);

        // reload and expect surveyResult
        const reloadResult = await SurveyResult.model
          .findOne({ token })
          .lean();

        expect(reloadResult.preview).to.be.eq(true);

        expect(res.body._id).to.be.eq(reloadResult._id.toString());
      });

      it('should reject for wrong token', async () => {
        const token = uuid();
        await agent
          .post('/api/v1/survey-answers')
          .send({ token })
          .expect(httpStatus.NOT_FOUND);
      });

      it('should reject if survey does not exist', async () => {
        const token = uuid();
        await inviteFactory({ survey: team._id, token, company, type: 'company' });
        await agent
          .post('/api/v1/survey-answers')
          .send({ token })
          .expect(httpStatus.NOT_FOUND);
      });
    });

    describe('As team user', () => {
      const agent = request.agent(app);
      before(async () => {
        await agent
          .post('/api/v1/authentication')
          .send({
            login: email2,
            password
          });
      });

      it('should create survey result', async () => {
        const token = uuid();
        await inviteFactory({ survey, token, team, company, type: 'team', preview: true });

        const res = await agent
          .post('/api/v1/survey-answers')
          .send({ token })
          .expect(httpStatus.OK);

        // reload and expect surveyResult
        const reloadResult = await SurveyResult.model
          .findOne({ token })
          .lean();

        expect(reloadResult.preview).to.be.eq(true);

        expect(res.body._id).to.be.eq(reloadResult._id.toString());
      });

      it('should reject for wrong token', async () => {
        const token = uuid();
        await agent
          .post('/api/v1/survey-answers')
          .send({ token })
          .expect(httpStatus.NOT_FOUND);
      });

      it('should reject if survey does not exist', async () => {
        const token = uuid();
        await inviteFactory({ survey: team._id, token, team, company, type: 'team' });
        await agent
          .post('/api/v1/survey-answers')
          .send({ token })
          .expect(httpStatus.NOT_FOUND);
      });

      it('should reject on incorrect user', async () => {
        const token = uuid();
        await inviteFactory({ survey, token, team, company, type: 'team', preview: true });
        await teamUser.remove();

        await agent
          .post('/api/v1/survey-answers')
          .send({ token })
          .expect(httpStatus.UNAUTHORIZED);
      });
    });
  });

  describe('By Target token', () => {
    let survey;
    let target;

    before(async () => {
      survey = await surveyFactory({ company, team });
      target = await targetFactory({ company, team, survey });
    });

    it('should create survey result with target', async () => {
      await request(app)
        .post('/api/v1/survey-answers')
        .send({
          surveyId: survey._id.toString(),
          fingerprintId: 'target',
          targetId: target._id.toString()
        })
        .expect(httpStatus.OK);

      // reload surveyResult
      const surveyResult = await SurveyResult.model.findOne({ fingerprintId: 'target' }).lean();

      expect(surveyResult.target.toString()).to.be.eq(target._id.toString());
    });
  });
});
