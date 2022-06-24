// import uuid from 'uuid';
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
// import { User } from 'server/models';
//
// // factories
// import {
//   userFactory,
//   contentFactory,
// } from 'server/tests/factories';
//
// chai.config.includeStack = true;
//
// let content;
// let reloadedUser;
// let notApprovedUser;
// let confirmationToken;
// const password = '123123123';
//
// async function makeTestData() {
//   // create user
//   [
//     notApprovedUser,
//     content
//   ] = await Promise.all([
//     userFactory({}),
//     contentFactory({})
//   ]);
//
//   // set confirmation token to Redis
//   confirmationToken = uuid();
//   await redisClient
//   .setAsync(`userConfirmationToken:${confirmationToken}`, notApprovedUser._id.toString());
//
//   await APIMessagesExtractor.loadData();
// }
//
// describe('## POST /api/v1/registration/confirm/user', () => {
//   before(cleanData);
//
//   before(makeTestData);
//
//   it('should return error for wrong confirmation token', async () => {
//     await request(app)
//       .post('/api/v1/registration/confirm/user')
//       .send({
//         password,
//         confirmPassword: password,
//         confirmationToken: 'wrongToken'
//       }).expect(httpStatus.BAD_REQUEST);
//   });
//
//   it('should return error when password and confirm password are not compare', async () => {
//     const res = await request(app)
//       .post('/api/v1/registration/confirm/user')
//       .send({
//         password,
//         confirmationToken,
//         confirmPassword: 'aaaaaaaa'
//       }).expect(httpStatus.BAD_REQUEST);
//
//     expect(res.body.message.passwordConfirm).to.be.eq(content.apiErrors.password.confirm);
//   });
//
//   it('should return error when user was not found', async () => {
//     const token = uuid();
//     await redisClient.setAsync(`userConfirmationToken:${token}`, content._id.toString());
//     await request(app)
//       .post('/api/v1/registration/confirm/user')
//       .send({
//         password,
//         confirmationToken: token,
//         confirmPassword: password
//       }).expect(httpStatus.BAD_REQUEST);
//   });
//
//   describe('When valid data was given', () => {
//     before(async () => {
//       await request(app)
//         .post('/api/v1/registration/confirm/user')
//         .send({
//           password,
//           confirmationToken,
//           confirmPassword: password
//         }).expect(httpStatus.OK);
//       reloadedUser = await User.model.findById(notApprovedUser);
//     });
//
//     it('should set password to user', () => {
//       reloadedUser._.password.compare(password, (err, isMatch) => {
//         expect(isMatch).to.be.eq(true);
//       });
//     });
//
//     it('should set user status to approved', async () => {
//       expect(reloadedUser.acceptedAt).to.be.an('date');
//     });
//
//     it('should response with auth token', async () => {
//       const keys = await redisClient.keysAsync('authToken:*');
//       expect(keys.length).to.be.eq(1);
//     });
//   });
// });
