import request from 'supertest';
import httpStatus from 'http-status';
import chai, { expect } from 'chai';
import app from 'index';

// models
import { User } from 'server/models';

// helpers
import cleanData from 'server/tests/testHelpers/cleanData';

// factories
import {
  userFactory,
  teamFactory,
  companyFactory,
  teamUserFactory
} from 'server/tests/factories';

chai.config.includeStack = true;

let team;
let team2;
let team3;
let company;
let company2;
let user;
let powerUser;

const password = 'qwe1';
const email = 'test1@email.com';
const email2 = 'test2@email.com';
const email3 = 'test3@email.com';
const email4 = 'test4@email.com';

async function makeTestData() {
  // create company and team
  [company, company2] = await Promise.all([companyFactory({}), companyFactory({})]);
  [team, team2, team3] = await Promise.all(
    [teamFactory({ company }), teamFactory({ company }), teamFactory({ company: company2 })]
  );

  // create power users
  [powerUser, user] = await Promise.all([
    userFactory({ email, password, company, currentTeam: team, isPowerUser: true }),
    userFactory({
      email: email2, password, company, currentTeam: team, isPowerUser: false
    })
  ]);

  await Promise.all([
    userFactory({
      email: email3,
      password,
      company: company2,
      currentTeam: team3,
      isPowerUser: true
    }),
    userFactory({
      email: email4,
      password,
      company: company2,
      currentTeam: team3,
      isPowerUser: false
    })
  ]);

  // create related team users models
  await Promise.all([
    teamUserFactory({ company, team, user, }),
    teamUserFactory({ company, team: team2, user }),
  ]);
}

describe('## DELETE /api/v1/users/:id', () => {
  before(cleanData);

  before(makeTestData);

  describe('Authorized', () => {
    describe('As team user', () => {
      describe('From current company', () => {
        const agent = request.agent(app);
        before(async () => {
          await agent
            .post('/api/v1/authentication')
            .send({
              login: email2,
              password
            });
        });

        // User
        it('should remove user by id', async () => {
          await agent
            .delete(`/api/v1/users/${user._id.toString()}`)
            .expect(httpStatus.FORBIDDEN);
        });

        // Power User
        it('should reject remove power user', async () => {
          await agent
            .delete(`/api/v1/users/${powerUser._id.toString()}`)
            .expect(httpStatus.FORBIDDEN);
        });
      });

      describe('From another company', () => {
        const agent = request.agent(app);
        before(async () => {
          await agent
            .post('/api/v1/authentication')
            .send({
              login: email4,
              password
            });
        });

        // User
        it('should reject remove user by id', async () => {
          await agent
            .delete(`/api/v1/users/${user._id.toString()}`)
            .expect(httpStatus.FORBIDDEN);
        });

        // Power User
        it('should reject remove power user', async () => {
          await agent
            .delete(`/api/v1/users/${powerUser._id.toString()}`)
            .expect(httpStatus.FORBIDDEN);
        });
      });
    });

    describe('As Power User', () => {
      describe('From current company', () => {
        const agent = request.agent(app);
        before(async () => {
          await agent
            .post('/api/v1/authentication')
            .send({
              login: email,
              password
            });
        });

        // User
        it('should remove user by id', async () => {
          await agent
            .delete(`/api/v1/users/${user._id.toString()}`)
            .expect(httpStatus.NO_CONTENT);

          const deletedUser = await User.model.findById(user._id);
          expect(deletedUser).to.be.eq(null);
        });

        // Power User
        it('should reject remove user by id', async () => {
          await agent
            .delete(`/api/v1/users/${powerUser._id.toString()}`)
            .expect(httpStatus.FORBIDDEN);
        });
      });

      describe('From another company', () => {
        const agent = request.agent(app);
        before(async () => {
          await agent
            .post('/api/v1/authentication')
            .send({
              login: email3,
              password
            });
        });

        // User
        it('should remove user by id', async () => {
          await agent
            .delete(`/api/v1/users/${user._id.toString()}`)
            .expect(httpStatus.NOT_FOUND);
        });

        // Power User
        it('should reject remove power user', async () => {
          await agent
            .delete(`/api/v1/users/${powerUser._id.toString()}`)
            .expect(httpStatus.FORBIDDEN);
        });

        it('should reject not found remove power user', async () => {
          await agent
            .delete(`/api/v1/users/${team._id}`)
            .expect(httpStatus.NOT_FOUND);
        });
      });
    });
  });

  describe('Unauthorized', () => {
    it(' with unauthorized status', async () => {
      await request(app)
        .delete(`/api/v1/users/${user._id.toString()}`)
        .expect(httpStatus.UNAUTHORIZED);
    });
  });
});
