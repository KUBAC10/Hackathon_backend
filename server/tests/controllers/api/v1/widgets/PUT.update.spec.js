import request from 'supertest';
import httpStatus from 'http-status';
import chai, { expect } from 'chai';
import app from 'index';

// helpers
import cleanData from 'server/tests/testHelpers/cleanData';

// factories
import {
  teamFactory,
  companyFactory,
  userFactory,
  teamUserFactory,
  dashboardFactory,
  widgetFactory,
  surveyFactory
} from '../../../../factories';

chai.config.includeStack = true;

const email = 'test@email.com';
const password = 'qwe123qwe';

let company;
let team;
let survey;
let widget;

async function makeTestData() {
  company = await companyFactory({});
  team = await teamFactory({ company });

  survey = await surveyFactory({ company, team });

  const dashboard = await dashboardFactory({ company, team });

  widget = await widgetFactory({ company, team, dashboard });

  // create users
  const user = await userFactory({
    email,
    password,
    company,
    currentTeam: team,
    isPowerUser: true
  });

  await teamUserFactory({ user, team, company });
}

describe('## PUT /api/v1/widgets - update widget', () => {
  before(cleanData);

  before(makeTestData);

  describe('Authorized', () => {
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

      it('should update widget', async () => {
        const res = await agent
          .put(`/api/v1/widgets/${widget._id}`)
          .send({
            name: 'New Name',
            color: '#333333',
            surveys: [survey._id.toString()]
          })
          .expect(httpStatus.OK);

        expect(res.body.name).to.be.eq('New Name');
        expect(res.body.color).to.be.eq('#333333');
        expect(res.body.surveys).to.be.an('array');
        expect(res.body.surveys.length).to.be.eq(1);
        expect(res.body.surveys[0].toString()).to.be.eq(survey._id.toString());
      });
    });
  });

  describe('Unauthorized', () => {
    it('should reject with unauthorized status', async () => {
      await request(app)
        .put(`/api/v1/widgets/${widget._id}`)
        .expect(httpStatus.UNAUTHORIZED);
    });
  });
});
