import request from 'supertest';
import httpStatus from 'http-status';
import chai, { expect } from 'chai';
import app from 'index';

// factories
import {
  companyFactory, tagFactory,
  userFactory
} from '../../../../factories';

// models
import {
  Company,
  User
} from '../../../../../models';

// helpers
import cleanData from '../../../../testHelpers/cleanData';

chai.config.includeStack = true;

const password = 'password';
const email = 'example@email.com';
const email2 = 'example2@email.com';

let company;
let user;
let tag;

async function makeTestData() {
  company = await companyFactory({});

  // create tag
  tag = await tagFactory({ company });

  // create lite user
  user = await userFactory({ company, email, password, isLite: true });

  // create powerUser
  await userFactory({ company, email: email2, password, isPowerUser: true });
}

describe('## POST /api/v1/registration/lite', () => {
  before(cleanData);

  before(makeTestData);

  describe('Authorized', () => {
    describe('As Lite User', () => {
      const agent = request.agent(app);

      before(async () => {
        await agent
          .post('/api/v1/authentication')
          .send({
            password,
            login: email
          });
      });

      it('should update company and user', async () => {
        await agent
          .put('/api/v1/registration/lite')
          .send({
            size: '2-15',
            industry: 'Software and IT services',
            role: 'Entrepreneur / Business owner',
            defaultTags: [tag._id.toString()]
          })
          .expect(httpStatus.OK);

        const [
          reloadCompany,
          reloadUser
        ] = await Promise.all([
          Company.model
            .findOne({ _id: company._id })
            .lean(),
          User.model
            .findOne({ _id: user._id })
            .lean()
        ]);

        expect(reloadCompany.size).to.be.eq('2-15');
        expect(reloadCompany.industry).to.be.eq('Software and IT services');
        expect(reloadUser.role).to.be.eq('Entrepreneur / Business owner');
        expect(reloadUser.defaultTags[0].toString()).to.be.eq(tag._id.toString());
      });

      it('should return not found', async () => {
        await Company.model.remove({ _id: company._id });

        await agent
          .put('/api/v1/registration/lite')
          .expect(httpStatus.NOT_FOUND);
      });
    });

    describe('As Power User', () => {
      const agent = request.agent(app);

      before(async () => {
        await agent
          .post('/api/v1/authentication')
          .send({
            password,
            login: email2
          });
      });

      it('should return forbidden status', async () => {
        await agent
          .put('/api/v1/registration/lite')
          .expect(httpStatus.FORBIDDEN);
      });
    });
  });

  describe('Unauthorized', () => {
    it('should return unauthorized status', async () => {
      await request(app)
        .put('/api/v1/registration/lite')
        .expect(httpStatus.UNAUTHORIZED);
    });
  });
});
