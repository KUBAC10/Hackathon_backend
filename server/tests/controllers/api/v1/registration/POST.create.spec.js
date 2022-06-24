// import request from 'supertest';
// import httpStatus from 'http-status';
// import chai, { expect } from 'chai';
// import app from 'index';
//
// // helpers
// import cleanData from 'server/tests/testHelpers/cleanData';
//
// // services
// import { APIMessagesExtractor } from 'server/services';
// import { redisClient } from 'server/services/RedisClientBuilder';
//
// // models
// import {
//   User,
//   Team,
//   Company,
// } from 'server/models';
//
// // factories
// import {
//   contentFactory,
// } from 'server/tests/factories';
//
// // attributes
// import { attributes as teamAttributes } from 'server/tests/factories/team.factory';
// import { attributes as userAttributes } from 'server/tests/factories/user.factory';
// import { attributes as companyAttributes } from 'server/tests/factories/company.factory';
//
// chai.config.includeStack = true;
//
// let res;
// let content;
// let newCompany;
// let userAttrs;
// let teamAttrs;
// let companyAttrs;
//
// async function makeTestData() {
//   // set attributes
//   [
//     content,
//     teamAttrs,
//     userAttrs,
//     companyAttrs
//   ] = await Promise.all([
//     contentFactory({}),
//     teamAttributes({}, true, ['company']),
//     userAttributes({}, true, ['company', 'password', 'isPowerUser', 'currentTeam']),
//     companyAttributes({}, true)
//   ]);
//
//   await APIMessagesExtractor.loadData();
// }
//
// describe('## POST /api/v1/registration', () => {
//   before(cleanData);
//
//   before(makeTestData);
//
//   before(async () => {
//     res = await request(app)
//       .post('/api/v1/registration')
//       .send({
//         teamAttrs,
//         userAttrs,
//         companyAttrs
//       }).expect(httpStatus.OK);
//     newCompany = await Company.model
//       .findOne({ email: companyAttrs.email, acceptedAt: { $eq: null } });
//   });
//
//   it('should create new not approved company', async () => {
//     expect(newCompany).to.be.an('object');
//   });
//
//   it('should create new not approved Power user which
//   was associated with new company', async () => {
//     const newUser = await User.model
//       .findOne({ email: userAttrs.email, acceptedAt: { $eq: null }, company: newCompany });
//     expect(newUser).to.be.an('object');
//     expect(newUser.isPowerUser).to.be.eq(true);
//   });
//
//   it('should create new team which was associated with new company', async () => {
//     const newTeam = await Team.model
//       .findOne({ name: teamAttrs.name, company: newCompany });
//     expect(newTeam).to.be.an('object');
//   });
//
//   it('should set new team as current team of Power User', async () => {
//     const [
//       newUser,
//       newTeam
//     ] = await Promise.all([
//       User.model
//         .findOne({ email: userAttrs.email, acceptedAt: { $eq: null }, company: newCompany }),
//       Team.model
//         .findOne({ name: teamAttrs.name, company: newCompany })
//     ]);
//     expect(newUser.currentTeam.toString()).to.be.eq(newTeam._id.toString());
//   });
//
//   it('should set userConfirmationToken to Redis', async () => {
//     const keys = await redisClient.keysAsync('userConfirmationToken:*');
//     expect(keys.length).to.be.eq(1);
//   });
//
//   it('should response with success message', () => {
//     expect(res.body.message).to.be.eq(content.apiMessages.registration.success);
//   });
// });
