// import request from 'supertest';
// import httpStatus from 'http-status';
// import chai, { expect } from 'chai';
// import app from 'index';
//
// // helpers
// import cleanData from 'server/tests/testHelpers/cleanData';
//
// // services
// import { redisClient } from 'server/services/RedisClientBuilder';
//
// // factories
// import {
//   userFactory,
//   companyFactory,
//   teamUserFactory,
// } from 'server/tests/factories';
//
// chai.config.includeStack = true;
//
// let company;
// let teamUser;
// let powerUser;
// const email = 'test@email.com';
// const password = 'qwe123qwe';
// const teamUserEmail = 'test1@email.com';
//
// async function makeTestData() {
//   // create company
//   company = await companyFactory({});
//
//   // create Power user
//   powerUser = await userFactory({ email, password, company, isPowerUser: true });
//
//   // create team user
//   teamUser = await userFactory({ email: teamUserEmail, password, company });
//   await teamUserFactory({ user: teamUser, company });
// }
//
// describe('## POST /api/v1/registration/confirm/request-company', () => {
//   before(cleanData);
//
//   before(makeTestData);
//
//   const agent = request.agent(app);
//   describe('By Power User', () => {
//     before(async () => {
//       await agent
//         .post('/api/v1/authentication')
//         .send({
//           login: email,
//           password
//         });
//     });
//
//     it('should return error when company was not found', async () => {
//       await agent
//         .post('/api/v1/registration/confirm/request-company')
//         .send({
//           companyId: powerUser._id.toString(),
//         }).expect(httpStatus.BAD_REQUEST);
//     });
//
//     describe('When valid data was given', () => {
//       it('should set companyConfirmationToken to Redis', async () => {
//         await agent
//           .post('/api/v1/registration/confirm/request-company')
//           .send({
//             companyId: company._id.toString(),
//           }).expect(httpStatus.OK);
//         const keys = await redisClient.keysAsync('companyConfirmationToken:*');
//         expect(keys.length).to.be.eq(1);
//       });
//     });
//   });
//
//   describe('By Team User', () => {
//     before(async () => {
//       await agent
//         .post('/api/v1/authentication')
//         .send({
//           login: teamUserEmail,
//           password
//         });
//     });
//
//     it('should reject with forbidden status', async () => {
//       await agent
//         .post('/api/v1/registration/confirm/request-company')
//         .send({
//           companyId: company._id.toString(),
//         }).expect(httpStatus.FORBIDDEN);
//     });
//   });
//
//   describe('Unauthorized', () => {
//     it('should reject with unauthorized status', async () => {
//       await request(app)
//         .post('/api/v1/registration/confirm/request-company')
//         .send({
//           companyId: company._id.toString(),
//         }).expect(httpStatus.UNAUTHORIZED);
//     });
//   });
// });
