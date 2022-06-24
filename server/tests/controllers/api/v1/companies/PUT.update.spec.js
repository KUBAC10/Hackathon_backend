import request from 'supertest';
import httpStatus from 'http-status';
import chai, { expect } from 'chai';
import app from 'index';

// helpers
import cleanData from 'server/tests/testHelpers/cleanData';

// factories
import {
  userFactory,
  countryFactory,
  companyFactory,
} from 'server/tests/factories/';

chai.config.includeStack = true;

let country;
let company;
const password = '123123';
const email = 'asd@example.com';

async function makeTestData() {
  company = await companyFactory({});
  await userFactory({ password, email, company, isPowerUser: true });
  country = await countryFactory({});
}

describe('## PUT /api/v1/companies/:id', () => {
  before(cleanData);

  before(makeTestData);

  describe('# PUT unauthorized /api/v1/companies/:id', () => {
    it('should reject unauthorized', async () => {
      await request(app)
        .put('/api/v1/companies')
        .expect(httpStatus.UNAUTHORIZED);
    });
  });

  describe('# PUT /api/v1/companies/:id', () => {
    const agent = request.agent(app);
    before(async () => {
      await agent
        .post('/api/v1/authentication')
        .send({
          login: email,
          password
        });
    });

    it('should update company information', async () => {
      const res = await agent
        .put('/api/v1/companies')
        .send({
          name: 'DDDD',
          urlName: 'url-name',
          address: {
            country: country._id.toString(),
            city: 'city',
            street: 'street',
            zipCode: '12332'
          },
          email: 'email@example.com'
        })
        .expect(httpStatus.OK);

      expect(res.body.name).to.equal('DDDD');
    });
  });
});
