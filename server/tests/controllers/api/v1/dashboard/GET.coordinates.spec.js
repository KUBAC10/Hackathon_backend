// import request from 'supertest';
// import httpStatus from 'http-status';
// import chai, { expect } from 'chai';
// import app from 'index';
// import moment from 'moment';
//
// // helpers
// import cleanData from 'server/tests/testHelpers/cleanData';
// import { redisClient } from 'server/services/RedisClientBuilder';
//
// // factories
// import {
//   teamFactory,
//   userFactory,
//   companyFactory,
//   teamUserFactory,
//   surveyFactory
// } from 'server/tests/factories';
//
// chai.config.includeStack = true;
// const agent = request.agent(app);
//
// let company;
// let company2;
//
// let team;
// let survey;
// let survey2;
//
// const email = 'test@email.com';
// const email2 = 'test2@email.com';
// const password = '123123123';
//
// async function makeTestData() {
//   // Create company and Power User
//   [
//     company,
//     company2
//   ] = await Promise.all([
//     companyFactory({}),
//     companyFactory({})
//   ]);
//
//   team = await teamFactory({});
//
//   [
//     survey,
//     survey2
//   ] = await Promise.all([
//     surveyFactory({ company }),
//     surveyFactory({ company: company2 })
//   ]);
//
//   await userFactory({ email, password, currentTeam: team, company, isPowerUser: true });
//
//   // create Team user
//   const teamUser = await userFactory({ email: email2, password, company, currentTeam: team });
//   await teamUserFactory({ user: teamUser, team, company });
//
//   const geoDataToken1 = {
//     surveyId: survey._id.toString(),
//     lat: '11111',
//     lng: '22222',
//     token: 'token',
//     time: moment().format('x')
//   };
//
//   const geoDataFingerPrint1 = {
//     surveyId: survey._id.toString(),
//     lat: '33333',
//     lng: '44444',
//     fingerprintId: 'fingerprint',
//     time: moment().add(1, 'minute').format('x')
//   };
//
//   const geoDataToken2 = {
//     surveyId: survey2._id.toString(),
//     lat: '11111',
//     lng: '22222',
//     token: 'token',
//     time: moment().format('x')
//   };
//
//   const geoDataFingerPrint2 = {
//     surveyId: survey2._id.toString(),
//     lat: '33333',
//     lng: '44444',
//     fingerprintId: 'fingerprint',
//     time: moment().add(1, 'minute').format('x')
//   };
//
//   // set coordinates to Redis
//   await redisClient.hmsetAsync(`geo:${company._id.toString()}:token`, geoDataToken1);
//   await redisClient.hmsetAsync(`geo:${company._id.toString()}:fingerprint`, geoDataFingerPrint1);
//
//   await redisClient.hmsetAsync(`geo:${company2._id.toString()}:token`, geoDataToken2);
//   await redisClient.hmsetAsync(`geo:${company2._id
//   .toString()}:fingerprint`, geoDataFingerPrint2);
// }
//
// describe('Dashboard Coordinates', () => {
//   before(cleanData);
//
//   before(makeTestData);
//
//   describe('#GET /api/v1/dashboard/coordinates/list', () => {
//     describe('As Power User', () => {
//       before(async () => {
//         await agent
//           .post('/api/v1/authentication')
//           .send({
//             password,
//             login: email
//           });
//       });
//
//       it('should return list of coordinates with survey
//       for dashboard map in request company scope', async () => {
//         const res = await agent
//           .get('/api/v1/dashboard/coordinates/list')
//           .expect(httpStatus.OK);
//
//         expect(res.body).to.be.an('array');
//         expect(res.body.length).to.be.eq(2);
//         expect(res.body.map(i => i.surveyId))
//           .to.not.include.members([survey2._id.toString()]);
//         expect(res.body[0].lng).to.be.eq('44444');
//         expect(res.body[1].lat).to.be.eq('11111');
//       });
//     });
//
//     describe('As Team User', () => {
//       before(async () => {
//         await agent
//           .post('/api/v1/authentication')
//           .send({
//             password,
//             login: email2
//           });
//       });
//
//       it('should return list of coordinates with survey for dashboard map', async () => {
//         const res = await agent
//           .get('/api/v1/dashboard/coordinates/list')
//           .expect(httpStatus.OK);
//
//         expect(res.body).to.be.an('array');
//         expect(res.body.length).to.be.eq(2);
//         expect(res.body[0].survey._id).to.be.eq(survey._id.toString());
//         expect(res.body[0].lng).to.be.eq('44444');
//         expect(res.body[1].lat).to.be.eq('11111');
//       });
//     });
//
//     describe('Unauthorized', () => {
//       it('should reject with unauthorized status', async () => {
//         await request(app)
//           .get('/api/v1/dashboard/coordinates/list')
//           .expect(httpStatus.UNAUTHORIZED);
//       });
//     });
//   });
// });
