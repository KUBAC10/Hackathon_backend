import request from 'supertest';
import httpStatus from 'http-status';
import chai, { expect } from 'chai';
import app from 'index';

// factories
import {
  companyFactory,
  teamFactory,
  teamUserFactory,
  userFactory
} from '../../../../factories';

// models
import {
  Team,
  Trash
} from '../../../../../models';

// helpers
import cleanData from '../../../../testHelpers/cleanData';

chai.config.includeStack = true;

const password = 'qwe123qwe';
const email = 'test@email.com';
const email2 = 'test2@email.com';

let team;
let company;

async function makeTestData() {
  company = await companyFactory({});
  team = await teamFactory({ company });

  // create Power user
  await userFactory({ email, password, company, currentTeam: team, isPowerUser: true });

  // create Team user
  const user = await userFactory({ email: email2, password, company, currentTeam: team });

  await teamUserFactory({ user, team, company });
}

describe('# DELETE /api/v1/teams/:id', () => {
  before(cleanData);

  before(makeTestData);

  describe('Authorized', () => {
    describe('As Power User', () => {
      const agent = request.agent(app);
      before(async () => {
        await agent
          .post('/api/v1/authentication')
          .send({
            login: email,
            password
          });
      });

      it('should soft delete team', async () => {
        const teamToRemove = await teamFactory({ company });

        await agent
          .delete(`/api/v1/teams/${teamToRemove._id}`)
          .expect(httpStatus.NO_CONTENT);

        const [
          teamReload,
          trash
        ] = await Promise.all([
          Team.model
            .findOne({ _id: teamToRemove._id })
            .lean(),
          Trash.model
            .findOne({ team: teamToRemove._id, type: 'team' })
            .lean()
        ]);

        expect(teamReload).to.be.an('object');
        expect(teamReload.inTrash).to.be.eq(true);

        expect(trash).to.be.an('object');
        expect(trash.stage).to.be.eq('clearing');
      });

      it('should forbid to remove last team in company', async () => {
        await agent
          .delete(`/api/v1/teams/${team._id}`)
          .expect(httpStatus.FORBIDDEN);
      });
    });

    describe('As Team User', () => {
      const agent = request.agent(app);
      before(async () => {
        await agent
          .post('/api/v1/authentication')
          .send({
            login: email2,
            password
          });
      });

      it('should reject with unauthorized status', async () => {
        await agent
          .delete(`/api/v1/teams/${team._id}`)
          .expect(httpStatus.FORBIDDEN);
      });
    });
  });

  describe('Unauthorized', () => {
    it('should reject with unauthorized status', async () => {
      await request(app)
        .delete(`/api/v1/teams/${company._id}`)
        .expect(httpStatus.UNAUTHORIZED);
    });
  });
});
