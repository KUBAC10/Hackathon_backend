import request from 'supertest';
import httpStatus from 'http-status';
import chai, { expect } from 'chai';
import app from 'index';

// helpers
import cleanData from 'server/tests/testHelpers/cleanData';

// models
import {
  Company,
  CompanyColor
} from 'server/models/';

// factories
import {
  userFactory,
  companyFactory,
  companyColorFactory,
  teamUserFactory,
  teamFactory
} from 'server/tests/factories';

chai.config.includeStack = true;

let company;
let color1;
let color2;
let color3;

const password = '123123';
const email = 'asd@example.com';
const email2 = 'aasdsd@example.com';

async function makeTestData() {
  company = await companyFactory({});
  const team = await teamFactory({ company });

  [
    color1,
    color2,
    color3,
  ] = await Promise.all([
    companyColorFactory({ company, value: '#000001' }),
    companyColorFactory({ company, value: '#000002' }),
    companyColorFactory({ company, value: '#000003' }),
  ]);

  // create power User
  await userFactory({ email, password, company, currentTeam: team, isPowerUser: true });

  // create Team user
  const teamUser = await userFactory({ email: email2, password, company, currentTeam: team });
  await teamUserFactory({ user: teamUser, team, company });
}

describe('## PUT /api/v1/company-colors', () => {
  beforeEach(cleanData);

  beforeEach(makeTestData);

  describe('Authorized', () => {
    describe('As Power User', () => {
      const agent = request.agent(app);
      beforeEach(async () => {
        await agent
          .post('/api/v1/authentication')
          .send({
            login: email,
            password
          });
      });

      it('should update company colors', async () => {
        const doc = await Company.model.findById(company);

        expect(doc.colors.primary).to.be.eq('#000001');
        expect(doc.colors.secondary).to.be.eq('#000002');

        const res = await agent
          .put('/api/v1/company-colors')
          .send({
            colors: { primary: '#000000', secondary: '#DDDDDD' }
          })
          .expect(httpStatus.OK);

        const reloadCompany = await Company.model.findById(company);

        expect(reloadCompany.colors.primary).to.be.eq('#000000');
        expect(reloadCompany.colors.secondary).to.be.eq('#DDDDDD');
        expect(res.body.colors.primary).to.be.eq('#000000');
        expect(res.body.colors.secondary).to.be.eq('#DDDDDD');
      });

      it('should update values for CompanyColor', async () => {
        const companyColors = [
          { _id: color1._id, value: '#111111' },
          { _id: color2._id, value: '#222222' },
          { _id: color3._id, value: '#333333' },
        ];

        const res = await agent
          .put('/api/v1/company-colors')
          .send({ companyColors })
          .expect(httpStatus.OK);

        const reloadColor1 = await CompanyColor.model.findById(color1);
        const reloadColor2 = await CompanyColor.model.findById(color2);
        const reloadColor3 = await CompanyColor.model.findById(color3);

        expect(reloadColor1.value).to.be.eq('#111111');
        expect(reloadColor2.value).to.be.eq('#222222');
        expect(reloadColor3.value).to.be.eq('#333333');
        expect(res.body.companyColors.length).to.be.eq(3);
      });

      it('should delete old companyColors and create new', async () => {
        const res = await agent
          .put('/api/v1/company-colors')
          .send({
            companyColors: [{ value: '#123123' }]
          })
          .expect(httpStatus.OK);

        expect(res.body.companyColors.length).to.be.eq(1);
        expect(res.body.companyColors[0].value).to.be.eq('#123123');
      });

      it('should reject not found status', async () => {
        await Company.model.remove({ _id: company._id });

        await agent
          .put('/api/v1/company-colors')
          .send({
            companyColors: [{ value: '#123123' }]
          })
          .expect(httpStatus.NOT_FOUND);
      });
    });

    describe('As Team User', () => {
      const agent = request.agent(app);
      beforeEach(async () => {
        await agent
          .post('/api/v1/authentication')
          .send({
            login: email2,
            password
          });
      });

      it('should not update company colors', async () => {
        await agent
          .put('/api/v1/company-colors')
          .send({
            colors: { primary: '#000000', secondary: '#DDDDDD' }
          })
          .expect(httpStatus.FORBIDDEN);
      });
    });
  });

  describe('Unauthorized', () => {
    it('should reject with unauthorized status', async () => {
      await request(app)
        .put('/api/v1/company-colors')
        .send({
          colors: { primary: '#000000', secondary: '#DDDDDD' }
        })
        .expect(httpStatus.UNAUTHORIZED);
    });
  });
});
