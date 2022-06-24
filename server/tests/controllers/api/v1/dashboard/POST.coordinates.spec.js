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
//   surveyFactory,
//   surveyResultFactory
// } from 'server/tests/factories';
// import SurveyResult from '../../../../../models/SurveyResult';
//
// chai.config.includeStack = true;
//
// let survey;
// let surveyResultId;
//
// async function makeTestData() {
//   // create survey
//   survey = await surveyFactory({}, true);
//   surveyResultId = await surveyResultFactory({ survey: survey._id.toString() }, true);
// }
//
// describe('## POST /api/v1/dashboard/coordinates', () => {
//   before(cleanData);
//
//   before(makeTestData);
//
//   const agent = request.agent(app);
//
//   describe('When valid data was given', () => {
//     it('should set fingerprintId and coordinates to Redis', async () => {
//       await agent
//         .post('/api/v1/dashboard/coordinates')
//         .send({
//           surveyId: survey._id.toString(),
//           fingerprintId: 'asdasdasda123123',
//           lng: '8.686528',
//           lat: '50.08162',
//           surveyResultId: surveyResultId._id
//         }).expect(httpStatus.OK);
//
//       const keys = await redisClient.keysAsync(`geo:${survey.company}:asdasdasda123123`);
//       const lng = await redisClient.hgetAsync(`geo:${survey.company}:asdasdasda123123`, 'lng');
//       const lat = await redisClient.hgetAsync(`geo:${survey.company}:asdasdasda123123`, 'lat');
//       const surveyId = await redisClient
//       .hgetAsync(`geo:${survey.company}:asdasdasda123123`, 'surveyId');
//
//       expect(keys.length).to.be.eq(1);
//       expect(lng).to.be.eq('8.686528');
//       expect(lat).to.be.eq('50.08162');
//       expect(surveyId).to.be.eq(survey._id.toString());
//     });
//
//     it('should set token and coordinates to Redis', async () => {
//       await agent
//         .post('/api/v1/dashboard/coordinates')
//         .send({
//           surveyId: survey._id.toString(),
//           token: 'token',
//           lng: '8.686528',
//           lat: '50.08162',
//           surveyResultId: surveyResultId._id
//         }).expect(httpStatus.OK);
//
//       const keys = await redisClient.keysAsync(`geo:${survey.company}:token`);
//       const lng = await redisClient.hgetAsync(`geo:${survey.company}:token`, 'lng');
//       const lat = await redisClient.hgetAsync(`geo:${survey.company}:token`, 'lat');
//       const surveyId = await redisClient.hgetAsync(`geo:${survey.company}:token`, 'surveyId');
//
//       expect(keys.length).to.be.eq(1);
//       expect(lng).to.be.eq('8.686528');
//       expect(lat).to.be.eq('50.08162');
//       expect(surveyId).to.be.eq(survey._id.toString());
//     });
//
//     it('should set coordinates and user location address to surveyResult', async () => {
//       await agent
//         .post('/api/v1/dashboard/coordinates')
//         .send({
//           surveyId: survey._id.toString(),
//           token: 'testToken',
//           lng: '8.686528',
//           lat: '50.08162',
//           surveyResultId: surveyResultId._id
//         }).expect(httpStatus.OK);
//
//       const keys = await redisClient.keysAsync(`geo:${survey.company}:asdasdasda123123`);
//       const lng = await redisClient.hgetAsync(`geo:${survey.company}:asdasdasda123123`, 'lng');
//       const lat = await redisClient.hgetAsync(`geo:${survey.company}:asdasdasda123123`, 'lat');
//       const surveyId = await redisClient
//       .hgetAsync(`geo:${survey.company}:asdasdasda123123`, 'surveyId');
//       const surveyResultFound = await SurveyResult.model
//         .findOne({ survey: surveyId, token: 'testToken' })
//         .lean();
//
//       expect(keys.length).to.be.eq(1);
//       expect(lng).to.be.eq('8.686528');
//       expect(lat).to.be.eq('50.08162');
//       expect(surveyId).to.be.eq(survey._id.toString());
//       expect(surveyResultFound.location.coordinates.lat).to.be.eq('50.08162');
//       expect(surveyResultFound.location.coordinates.lng).to.be.eq('8.686528');
//       expect(surveyResultFound.location.formattedAddress).to.be.an('string');
//     });
//   });
//
//   describe('When invalid data was given', () => {
//     it('should reject, lat/lnt out of range from -90 to 90', async () => {
//       await agent
//         .post('/api/v1/dashboard/coordinates')
//         .send({
//           surveyId: survey._id.toString(),
//           fingerprintId: 'asdasdasda123123',
//           lng: '98.686528',
//           lat: '-150.08162',
//           surveyResultId: surveyResultId._id
//         }).expect(httpStatus.BAD_REQUEST);
//     });
//
//     it('should reject without required fields', async () => {
//       await agent
//         .post('/api/v1/dashboard/coordinates')
//         .send({
//           token: 'token'
//         })
//         .expect(httpStatus.BAD_REQUEST);
//     });
//
//     it('should reject if survey not found', async () => {
//       await agent
//         .post('/api/v1/dashboard/coordinates')
//         .send({
//           surveyId: surveyResultId._id.toString(),
//           token: 'token',
//           lng: '8.686528',
//           lat: '50.08162',
//           surveyResultId: surveyResultId._id
//         })
//         .expect(httpStatus.NOT_FOUND);
//     });
//   });
// });
