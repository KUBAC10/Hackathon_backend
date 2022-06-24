import request from 'supertest';
import httpStatus from 'http-status';
import chai, { expect } from 'chai';
import app from 'index';

// models
import { Invite } from 'server/models';

// factories
import {
  userFactory,
  teamFactory,
  companyFactory,
  contactFactory,
  surveyFactory,
  tagFactory,
  tagEntityFactory,
  contentFactory,
  inviteFactory
} from 'server/tests/factories';

// helpers
import cleanData from 'server/tests/testHelpers/cleanData';
import parseTpl from 'server/helpers/parse-es6-template';
import APIMessagesExtractor from 'server/services/APIMessagesExtractor';

chai.config.includeStack = true;

let team;
let survey;
let publicSurvey;
let company;
let content;
let contact1;
let contact2;
let contact3;
let contact4;
let contact5;
let contact6;
let contactIds;
let contactWithInvite;
let tag1;
let tag2;
let tag3;
let tagIds;
const password = 'qwe123qwe';
const email = 'test@email.com';

async function makeTestData() {
  // create company and team
  company = await companyFactory({});
  team = await teamFactory({ company });
  content = await contentFactory({});

  // create Power user
  await userFactory({ email, password, company, currentTeam: team, isPowerUser: true });

  [
    survey,
    publicSurvey
  ] = await Promise.all([
    surveyFactory({ company }),
    surveyFactory({ company, publicAccess: true })
  ]);

  [
    tag1,
    tag2,
    tag3,
  ] = await Promise.all([
    tagFactory({ team }),
    tagFactory({ team }),
    tagFactory({ team }),
  ]);

  [
    contact1,
    contact2,
    contact3,
    contact4,
    contact5,
    contact6,
    contactWithInvite
  ] = await Promise.all([
    contactFactory({ team }),
    contactFactory({ team }),
    contactFactory({ team }),
    contactFactory({ team }),
    contactFactory({ team }),
    contactFactory({ team }),
    contactFactory({ team }),
  ]);

  await Promise.all([
    tagEntityFactory({ contact: contact3._id, tag: tag1._id }),
    tagEntityFactory({ contact: contact4._id, tag: tag2._id }),
    tagEntityFactory({ contact: contact5._id, tag: tag3._id }),
    tagEntityFactory({ contact: contact6._id, tag: tag3._id }),
  ]);

  tagIds = [
    tag1._id.toString(),
    tag2._id.toString()
  ];

  // existing invite for current survey
  await inviteFactory({ survey, contact: contactWithInvite });

  await APIMessagesExtractor.loadData();
}

describe('## POST /api/v1/invitation-contact', () => {
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

  it('should not return error when invite was sent on public survey', async () => {
    await agent
      .post('/api/v1/invitation-contact')
      .send({
        survey: publicSurvey._id.toString(),
        contactIds: [contact1._id]
      })
      .expect(httpStatus.OK);
  });

  it('should send invites to each contact of contact ids', async () => {
    const res = await agent
      .post('/api/v1/invitation-contact')
      .send({
        survey: survey._id.toString(),
        contactIds: [contact2._id]
      })
      .expect(httpStatus.OK);

    const message = parseTpl(content.apiMessages.survey.successfullySent, { processedContacts: 1 }, '');
    const newInvites = await Invite.model
      .find({ contact: { $in: [contact2._id] } })
      .lean();

    expect(newInvites.length).to.be.eq(1);
    expect(res.body.message).to.be.eq(message);
  });

  it('should send invites to each contact searched by tags', async () => {
    const res = await agent
      .post('/api/v1/invitation-contact')
      .send({
        survey: survey._id.toString(),
        tagIds
      })
      .expect(httpStatus.OK);

    const message = parseTpl(content.apiMessages.survey.successfullySent, { processedContacts: 2 }, '');
    const newInvites = await Invite.model
      .find({ contact: { $in: [contact3._id, contact4._id] } }).lean();
    expect(newInvites.length).to.be.eq(2);
    expect(res.body.message).to.be.eq(message);
  });

  it('should send invites contact searched by tags and contacts ids', async () => {
    const res = await agent
      .post('/api/v1/invitation-contact')
      .send({
        survey: survey._id.toString(),
        contactIds: [contact5._id.toString()],
        tagIds: [tag3._id.toString()]
      })
      .expect(httpStatus.OK);

    const message = parseTpl(content.apiMessages.survey.successfullySent, { processedContacts: 2 }, '');
    const newInvites = await Invite.model
      .find({ contact: { $in: [contact5._id, contact6._id] } }).lean();
    expect(newInvites.length).to.be.eq(2);
    expect(res.body.message).to.be.eq(message);
  });

  it('should not send invite to contact which was already invited to given survey', async () => {
    const res = await agent
      .post('/api/v1/invitation-contact')
      .send({
        survey: survey._id.toString(),
        contactIds: [contactWithInvite._id.toString()]
      })
      .expect(httpStatus.OK);

    const invites = await Invite.model
      .find({ contact: contactWithInvite, survey }).lean();
    const message = content.apiMessages.survey.noInvites;

    expect(invites.length).to.be.eq(1);
    expect(res.body.message).to.be.eq(message);
  });

  it('should return error if survey id does not exist', async () => {
    await agent
      .post('/api/v1/invitation-contact')
      .send({
        survey: team._id.toString(),
        contactIds: [contactWithInvite._id.toString()]
      })
      .expect(httpStatus.NOT_FOUND);
  });

  describe('Unauthorized', () => {
    it('should reject with unauthorized status', async () => {
      await request(app)
        .post('/api/v1/invitation-contact')
        .send({
          survey: survey._id.toString(),
          contactIds
        })
        .expect(httpStatus.UNAUTHORIZED);
    });
  });
});
