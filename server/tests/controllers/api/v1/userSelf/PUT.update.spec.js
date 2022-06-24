import request from 'supertest';
import httpStatus from 'http-status';
import chai, { expect } from 'chai';
import app from 'index';
import moment from 'moment';

// helpers
import cleanData from 'server/tests/testHelpers/cleanData';

// factories
import {
  userFactory,
  countryFactory,
  companyFactory,
  globalConfigFactory
} from '../../../../factories';


chai.config.includeStack = true;

let country;
let company;
let user;
const password = '123123';
const email = 'asd@example.com';

async function makeTestData() {
  company = await companyFactory({});
  user = await userFactory({ password, email, company });
  await globalConfigFactory();
  country = await countryFactory({});
}

describe('## PUT /api/v1/user-self/update', () => {
  before(cleanData);

  before(makeTestData);

  describe('# PUT unauthorized /api/v1/user-self/update', () => {
    it('should reject unauthorized', async () => {
      await request(app).put('/api/v1/user-self/update').expect(httpStatus.UNAUTHORIZED);
    });
  });

  describe('# PUT /api/v1/user-self/update', () => {
    const agent = request.agent(app);
    before(async () => {
      await agent
        .post('/api/v1/authentication')
        .send({
          login: email,
          password
        });
    });

    it('should update self-users information', async () => {
      const res = await agent
        .put('/api/v1/user-self/update')
        .send({
          name: {
            first: 'Test',
            last: 'User'
          },
          phoneNumber: '12321323',
          address: {
            country: country._id.toString(),
            city: 'city',
            street: 'street',
            zipCode: '12332'
          },
          email: 'email@example.com',
          defaultLanguage: 'en'
        })
        .expect(httpStatus.OK);

      expect(res.body.name.first).to.equal('Test');
    });

    it('should return error if user with this email already exists', async () => {
      await userFactory({ password, email: 'example@mail.com', company });

      const res = await agent
        .put('/api/v1/user-self/update')
        .send({
          email: 'example@mail.com',
        })
        .expect(httpStatus.BAD_REQUEST);

      expect(res.body.message.email).to.be.eq('User with this email already exists');
    });

    it('should return bad request because user has exceeded the change limit of email ', async () => {
      user.emailChangeCount = { [moment().startOf('day')]: 3 };

      await user.save();

      const res = await agent
        .put('/api/v1/user-self/update')
        .send({
          email: 'hello3@gmail.com',
        })
        .expect(httpStatus.BAD_REQUEST);

      expect(res.body.message.email).eq('Exceeded limit of email changes per day');
    });
  });
});
