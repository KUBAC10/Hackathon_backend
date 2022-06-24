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
  widgetFactory
} from '../../../../factories';

// models
import { Widget } from '../../../../../models';

chai.config.includeStack = true;

const email = 'test@email.com';
const password = 'qwe123qwe';

let company;
let team;
let widget;

async function makeTestData() {
  company = await companyFactory({});
  team = await teamFactory({ company });

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

describe('## DELETE /api/v1/widgets - remove widget', () => {
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

      it('should remove widget', async () => {
        await agent
          .delete(`/api/v1/widgets/${widget._id}`)
          .expect(httpStatus.NO_CONTENT);

        const reload = await Widget.model.findById(widget._id).lean();

        expect(reload).to.be.eq(null);
      });
    });
  });

  describe('Unauthorized', () => {
    it('should reject with unauthorized status', async () => {
      await request(app)
        .delete(`/api/v1/widgets/${widget._id}`)
        .expect(httpStatus.UNAUTHORIZED);
    });
  });
});
