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
// import { Company } from 'server/models';
//
// // factories
// import {
//   companyFactory,
//   contentFactory,
// } from 'server/tests/factories';
//
// chai.config.includeStack = true;
//
// let res;
// let content;
// let reloadedCompany;
// let notApprovedCompany;
// let confirmationToken;
//
// async function makeTestData() {
//   // create company
//   [
//     notApprovedCompany,
//     content
//   ] = await Promise.all([
//     companyFactory({}),
//     contentFactory({})
//   ]);
//
//   // set confirmation token to Redis
//   confirmationToken = uuid();
//   await redisClient
//   .setAsync(`companyConfirmationToken:${confirmationToken}`, notApprovedCompany._id.toString());
//
//   await APIMessagesExtractor.loadData();
// }
//
// describe('## POST /api/v1/registration/confirm/company', () => {
//   before(cleanData);
//
//   before(makeTestData);
//
//   it('should return error for wrong confirmation token', async () => {
//     await request(app)
//       .post('/api/v1/registration/confirm/company')
//       .send({
//         confirmationToken: 'wrongToken'
//       }).expect(httpStatus.BAD_REQUEST);
//   });
//
//   it('should return error when company was not found', async () => {
//     const token = uuid();
//     await redisClient.setAsync(`companyConfirmationToken:${token}`, content._id.toString());
//     await request(app)
//       .post('/api/v1/registration/confirm/company')
//       .send({
//         confirmationToken: token,
//       }).expect(httpStatus.BAD_REQUEST);
//   });
//
//   describe('When valid data was given', () => {
//     before(async () => {
//       res = await request(app)
//         .post('/api/v1/registration/confirm/company')
//         .send({
//           confirmationToken,
//         }).expect(httpStatus.OK);
//       reloadedCompany = await Company.model.findById(notApprovedCompany);
//     });
//
//     it('should set company status to approved', async () => {
//       expect(reloadedCompany.acceptedAt).to.be.an('date');
//     });
//
//     it('should response with success message', async () => {
//       expect(res.body.message).to.be.eq(content.apiMessages.company.confirm);
//     });
//   });
// });
