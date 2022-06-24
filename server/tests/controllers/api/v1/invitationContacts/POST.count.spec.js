import request from 'supertest';
import httpStatus from 'http-status';
import chai, { expect } from 'chai';
import app from 'index';

import {
  userFactory,
  teamFactory,
  companyFactory,
  contactFactory,
  tagFactory,
  tagEntityFactory
} from 'server/tests/factories';

// helpers
import cleanData from 'server/tests/testHelpers/cleanData';

chai.config.includeStack = true;

let team;
let company;
let contact1;
let contact2;
let contact3;
let contact4;
let contactIds;
let tag1;
let tag2;
let tagIds;
const password = 'qwe123qwe';
const email = 'test@email.com';

async function makeTestData() {
  // create company and team
  company = await companyFactory({});
  team = await teamFactory({ company });

  // create Power user
  await userFactory({ email, password, company, currentTeam: team, isPowerUser: true });

  [
    tag1,
    tag2
  ] = await Promise.all([
    tagFactory({ team }),
    tagFactory({ team })
  ]);

  [
    contact1,
    contact2,
    contact3,
    contact4
  ] = await Promise.all([
    contactFactory({ team }),
    contactFactory({ team }),
    contactFactory({ team }),
    contactFactory({ team })
  ]);

  await tagEntityFactory({ contact: contact1._id, tag: tag1._id });
  await tagEntityFactory({ contact: contact2._id, tag: tag1._id });
  await tagEntityFactory({ contact: contact3._id, tag: tag2._id });

  contactIds = [
    contact1._id.toString(),
    contact2._id.toString(),
    contact3._id.toString(),
    contact4._id.toString()
  ];

  tagIds = [
    tag1._id.toString(),
    tag2._id.toString()
  ];
}

describe('## POST /api/v1/invitation-contact/count', () => {
  before(cleanData);

  before(makeTestData);

  const agent = request.agent(app);

  before(async () => {
    await agent
      .post('/api/v1/authentication')
      .send({
        login: email,
        password
      });
  });

  it('should return valid count of contacts searched by contacts ids', async () => {
    const res = await agent
      .post('/api/v1/invitation-contact/count')
      .send({
        contactIds
      })
      .expect(httpStatus.OK);

    expect(res.body).to.be.eq(4);
  });

  it('should return valid count of contacts searched by tags', async () => {
    const res = await agent
      .post('/api/v1/invitation-contact/count')
      .send({
        tagIds
      })
      .expect(httpStatus.OK);

    expect(res.body).to.be.eq(3);
  });

  it('should return valid count of contacts searched by tags and contacts ids', async () => {
    const res = await agent
      .post('/api/v1/invitation-contact/count')
      .send({
        contactIds,
        tagIds
      })
      .expect(httpStatus.OK);

    expect(res.body).to.be.eq(4);
  });

  describe('Unauthorized', () => {
    it('should reject with unauthorized status', async () => {
      await request(app)
        .post('/api/v1/invitation-contact/count')
        .send({
          contactIds
        })
        .expect(httpStatus.UNAUTHORIZED);
    });
  });
});
