import request from 'supertest';
import httpStatus from 'http-status';
import chai, { expect } from 'chai';
import app from 'index';

import {
  userFactory,
  companyFactory,
  tableColumnSettingsFactory
} from 'server/tests/factories/';

// helpers
import cleanData from 'server/tests/testHelpers/cleanData';

import { TableColumnSettings, User } from 'server/models/';

chai.config.includeStack = true;

let contacts;
let data;
let company;
let user1;
let user2;
let existColumnSettings;
let res1;
let res2;
const email = 'test@email.com';
const email2 = 'test2@email.com';
const password = 'qwe123qwe';

async function makeTestData() {
  contacts = {
    name: true,
    email: true,
    phoneNumber: false,
    team: true,
    createdAt: false
  };

  data = {
    tags: {
      name: true,
      description: true,
      createdAt: false,
      updatedAt: false,
      createdBy: false,
      updatedBy: false
    }
  };

  existColumnSettings = await tableColumnSettingsFactory({ contacts });

  // create company and team
  company = await companyFactory({});
  [
    user1,
    user2
  ] = await Promise.all([
    userFactory({
      email, password, company, isPowerUser: true, tableColumnSettings: existColumnSettings
    }),
    userFactory({
      email: email2, password, company, isPowerUser: true
    })
  ]);
}

describe('## POST /api/v1/user-self/table-column-settings', () => {
  before(cleanData);

  before(makeTestData);

  describe('Authorized By Power User with exist table column settings', () => {
    const agent = request.agent(app);
    before(async () => {
      await agent
        .post('/api/v1/authentication')
        .send({
          login: email,
          password,
        });
      res1 = await agent
        .post('/api/v1/user-self/table-column-settings')
        .send(data)
        .expect(httpStatus.OK);
    });

    it('should update existing table settings with new and old values', async () => {
      const user = await User.model
        .findById(user1._id)
        .populate('tableColumnSettings');

      expect(user.tableColumnSettings.contacts.name).to.be.eq(true);
      expect(user.tableColumnSettings.tags.name).to.be.eq(true);
    });

    it('should response with valid data', async () => {
      expect(res1.body.contacts.createdAt).to.be.eq(false);
    });
  });

  describe('Authorized By Power User without table settings', () => {
    const agent = request.agent(app);
    before(async () => {
      await agent
        .post('/api/v1/authentication')
        .send({
          login: email2,
          password,
        });
      res2 = await agent
        .post('/api/v1/user-self/table-column-settings')
        .send(data)
        .expect(httpStatus.OK);
    });

    it('should create table column settings model with new values and assign it to user', async () => {
      const user = await User.model
        .findById(user2._id)
        .populate('tableColumnSettings');

      const tableColumnSettings = await TableColumnSettings.model
        .findById(user.tableColumnSettings._id);

      expect(tableColumnSettings).to.be.an('object');
      expect(user.tableColumnSettings.tags.createdAt).to.be.eq(false);
    });

    it('should response with valid data', async () => {
      expect(res2.body.tags.name).to.be.eq(true);
    });
  });
});
