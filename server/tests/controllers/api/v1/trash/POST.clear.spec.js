import request from 'supertest';
import httpStatus from 'http-status';
import chai, { expect } from 'chai';
import app from 'index';

// models
import { Trash } from 'server/models';

// helpers
import cleanData from 'server/tests/testHelpers/cleanData';

// factories
import {
  userFactory,
  teamFactory,
  companyFactory,
  teamUserFactory,
  trashFactory
} from 'server/tests/factories';

chai.config.includeStack = true;

let team;
let team2;
let company;
let company2;
let anotherCompTeam;
let teamUser;
let powerUser;
let trash;

const password = 'qwe1';
const email = 'test1@email.com';
const email2 = 'test2@email.com';

async function makeTestData() {
  // create company and team
  [company, company2] = await Promise.all([companyFactory({}), companyFactory({})]);
  [team, team2, anotherCompTeam] = await Promise.all(
    [
      teamFactory({ company }),
      teamFactory({ company }),
      teamFactory({ company: company2 }) // another company team
    ]
  );

  // create users
  [powerUser, teamUser] = await Promise.all([
    userFactory({ email, password, company, currentTeam: team, isPowerUser: true }),
    userFactory({
      email: email2, password, company, currentTeam: team, isPowerUser: false
    })
  ]);

  // create related team users models
  await Promise.all([
    teamUserFactory({ company, team, user: teamUser, }),
    teamUserFactory({ company, team: team2, user: teamUser }),
  ]);
}

describe('## POST /api/v1/trash/clear', () => {
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

      it('should set stage to clearing in current team', async () => {
        // create trash record
        trash = await trashFactory({ team: powerUser.currentTeam, company });

        await agent
          .post('/api/v1/trash/clear')
          .send({ ids: [trash._id] })
          .expect(httpStatus.OK);

        const trashRecord = await Trash.model.findById(trash._id).lean();
        expect(trashRecord.stage).to.be.eq('clearing');
      });

      it('should set stage to clearing in any company team', async () => {
        // create trash record
        trash = await trashFactory({ team: team2, company });

        await agent
          .post('/api/v1/trash/clear')
          .send({ ids: [trash._id] })
          .expect(httpStatus.OK);

        const trashRecord = await Trash.model.findById(trash._id).lean();
        expect(trashRecord.stage).to.be.eq('clearing');
      });

      it('should not set stage to clearing in another company team', async () => {
        // create trash record
        trash = await trashFactory({ team: anotherCompTeam, company: company2 });

        await agent
          .post('/api/v1/trash/clear')
          .send({ ids: [trash._id] })
          .expect(httpStatus.OK);
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

      it('should set stage to clearing in current team', async () => {
        // create trash record
        trash = await trashFactory({ team: teamUser.currentTeam, company });

        await agent
          .post('/api/v1/trash/clear')
          .send({ ids: [trash._id] })
          .expect(httpStatus.OK);

        const trashRecord = await Trash.model.findById(trash._id).lean();
        expect(trashRecord.stage).to.be.eq('clearing');
      });

      it('should not set stage to clearing in other company team', async () => {
        // create trash record
        trash = await trashFactory({ team: team2, company });

        await agent
          .post('/api/v1/trash/clear')
          .send({ ids: [trash._id] })
          .expect(httpStatus.OK);

        const trashRecord = await Trash.model.findById(trash._id).lean();
        expect(trashRecord.stage).to.be.eq('initial');
      });

      it('should not set stage to clearing in another company team', async () => {
        // create trash record
        trash = await trashFactory({ team: anotherCompTeam, company: company2 });

        await agent
          .post('/api/v1/trash/clear')
          .send({ ids: [trash._id] })
          .expect(httpStatus.OK);

        const trashRecord = await Trash.model.findById(trash._id).lean();
        expect(trashRecord.stage).to.be.eq('initial');
      });
    });
  });

  describe('Unauthorized', () => {
    it('should reject with unauthorized status', async () => {
      // create trash record
      trash = await trashFactory({ team: powerUser.currentTeam, company });

      await request(app)
        .post('/api/v1/trash/clear')
        .send({ ids: [trash._id] })
        .expect(httpStatus.UNAUTHORIZED);
    });
  });
});
