import request from 'supertest';
import httpStatus from 'http-status';
import chai, { expect } from 'chai';
import app from 'index';

import {
  userFactory,
  teamFactory,
  companyFactory,
  contactFactory,
  teamUserFactory
} from 'server/tests/factories/';

// helpers
import cleanData from 'server/tests/testHelpers/cleanData';

// models
import {
  Contact
} from 'server/models';

chai.config.includeStack = true;

let team;
let company;
let teamUser;
const password = 'qwe123qwe';
const email = 'test@email.com';
const teamUserEmail = 'team@email.com';

async function makeTestData() {
  // create company and team
  company = await companyFactory({});
  team = await teamFactory({ company });

  // create Power user
  await userFactory({ email, password, company, currentTeam: team, isPowerUser: true });

  // create Team user
  teamUser = await userFactory({ email: teamUserEmail, password, company, currentTeam: team });
  await teamUserFactory({ user: teamUser, team, company });

  // existing contact
  await contactFactory({ email: 'existing@email.com', team });
}

/** All expectations verified according to testImport.csv file data */
describe('## POST /api/v1/contacts/import/csv', () => {
  beforeEach(cleanData);

  beforeEach(makeTestData);

  const agent = request.agent(app);

  describe('by Power User', () => {
    beforeEach(async () => {
      await agent
        .post('/api/v1/authentication')
        .send({
          login: email,
          password
        });
    });

    it('should return error: Invalid file format, expect CSV. for non csv files', async () => {
      const res = await agent
        .post('/api/v1/contacts/import/csv')
        .type('form')
        .accept('text/csv')
        .accept('application/json')
        .attach('csv', 'server/tests/testImport.notcsv')
        .expect(httpStatus.UNPROCESSABLE_ENTITY);

      expect(res.body.error).to.be.eq('Invalid file format, expect CSV.');
    });

    it('should import new contacts from CSV file and response with message', async () => {
      const res = await agent
        .post('/api/v1/contacts/import/csv')
        .type('form')
        .accept('text/csv')
        .accept('application/json')
        .attach('csv', 'server/tests/testImport.csv')
        .expect(httpStatus.OK);
      expect(res.body.message).to.be.eq('2 new contacts were added and 1 updated!');
    });

    it('should skip contact if it exists in team', async () => {
      const contactsBeforeCount = await Contact.model.find({}).countDocuments();

      await agent
        .post('/api/v1/contacts/import/csv')
        .type('form')
        .accept('text/csv')
        .accept('application/json')
        .attach('csv', 'server/tests/testImport.csv')
        .expect(httpStatus.OK);

      expect(contactsBeforeCount + 2).to.be.eq(3); // in csv file two new contacts
    });

    it('should reject if file has invalid columns', async () => {
      const res = await agent
        .post('/api/v1/contacts/import/csv')
        .type('form')
        .accept('text/csv')
        .accept('application/json')
        .attach('csv', 'server/tests/testImportInvalidColumns.csv')
        .expect(httpStatus.BAD_REQUEST);

      expect(res.body.message).to.be.eq('Your file has invalid columns');
    });

    it('should return array of errors', async () => {
      const res = await agent
        .post('/api/v1/contacts/import/csv')
        .type('form')
        .accept('text/csv')
        .accept('application/json')
        .attach('csv', 'server/tests/testImportInvalidRows.csv')
        .expect(httpStatus.OK);

      expect(res.body.message).to.be.eq('1 new contacts were added and 0 updated!');
      expect(res.body.errors.length).to.be.eq(2);

      const [err1, err2] = res.body.errors;

      expect(err1).to.be.eq('1: Missing email value');
      expect(err2).to.be.eq('2: Wrong email format');
    });
  });

  describe('by Team User', () => {
    beforeEach(async () => {
      await agent
        .post('/api/v1/authentication')
        .send({
          login: teamUserEmail,
          password
        });
    });

    it('should get team id from team user', async () => {
      await agent
        .post('/api/v1/contacts/import/csv')
        .type('form')
        .accept('text/csv')
        .accept('application/json')
        .attach('csv', 'server/tests/testImport.csv')
        .expect(httpStatus.OK);
    });
  });

  describe('Unauthorized', () => {
    it('should reject with unauthorized status', async () => {
      await request(app)
        .post('/api/v1/contacts/import/csv')
        .type('form')
        .accept('text/csv')
        .accept('application/json')
        .attach('csv', 'server/tests/testImport.csv')
        .expect(httpStatus.UNAUTHORIZED);
    });
  });
});
