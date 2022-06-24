// import request from 'supertest';
// import httpStatus from 'http-status';
// import chai, { expect } from 'chai';
// import app from 'index';
//
// // helpers
// import cleanData from 'server/tests/testHelpers/cleanData';
//
// // models
// import { DashboardItem } from 'server/models';
//
// // factories
// import {
//   companyFactory,
//   teamFactory,
//   userFactory,
//   questionFactory,
//   teamUserFactory,
//   dashboardItemFactory,
// } from 'server/tests/factories';
//
// chai.config.includeStack = true;
//
// let team;
// let company;
// let user;
// let question1;
// let question2;
// let question3;
// let dashboardItem2;
// let dashboardItem3;
// let teamUser;
// const password = 'qwe123qwe';
// const email = 'test@email.com';
// const email3 = 'test3@email.com';
//
// async function makeTestData() {
//   company = await companyFactory({});
//   team = await teamFactory({ company });
//   [
//     question1,
//     question2,
//     question3
//   ] = await Promise.all([
//     questionFactory({ company, team, type: 'dropdown' }),
//     questionFactory({ company, team, type: 'multipleChoice' }),
//     questionFactory({ company, team, type: 'checkboxes' })
//   ]);
//
//   // create Power user
//   user = await userFactory({
//     email, password, company, currentTeam: team, isPowerUser: true
//   });
//
//   // create Team user
//   teamUser = await userFactory({ email: email3, password, company, currentTeam: team });
//   await teamUserFactory({ user: teamUser, team, company });
// }
//
// describe('## POST /api/v1/dashboard/items', () => {
//   describe('Authorized', () => {
//     describe('as Power User', () => {
//       before(cleanData);
//
//       before(makeTestData);
//       const agent = request.agent(app);
//       before(async () => {
//         await agent
//           .post('/api/v1/authentication')
//           .send({
//             login: email,
//             password
//           });
//       });
//       describe('without dashboard items', () => {
//         it('should create dashboard item with correct sortableId', async () => {
//           const res = await agent
//             .post('/api/v1/dashboard/items')
//             .send({
//               type: 'question',
//               items: [
//                 question1._id.toString()
//               ]
//             }).expect(httpStatus.OK);
//
//           const dashboardItem = await DashboardItem.model
//             .findOne({ user, question: question1, team })
//             .lean();
//
//           expect(dashboardItem.sortableId).to.be.eq(0);
//           expect(res.body.length).to.be.eq(1);
//         });
//       });
//
//       describe('with dashboard items', () => {
//         beforeEach(async () => {
//           [
//             dashboardItem2,
//             dashboardItem3
//           ] = await Promise.all([
//             dashboardItemFactory({ question: question2, sortableId: 0, user }),
//             dashboardItemFactory({ question: question3, sortableId: 1, user })
//           ]);
//         });
//
//         it('should update dashboard items with correct sortableId', async () => {
//           const res = await agent
//             .post('/api/v1/dashboard/items')
//             .send({
//               type: 'question',
//               items: [
//                 question3._id.toString(),
//                 question2._id.toString()
//               ]
//             }).expect(httpStatus.OK);
//
//           const updatedDashboardItem = await DashboardItem.model
//             .findById({ _id: dashboardItem2._id });
//
//           expect(updatedDashboardItem.sortableId).to.be.eq(1);
//           expect(res.body.length).to.be.eq(2);
//         });
//
//         it('should remove unnecessary dashboard items', async () => {
//           await agent
//             .post('/api/v1/dashboard/items')
//             .send({
//               type: 'question',
//               items: [
//                 question2._id.toString()
//               ]
//             }).expect(httpStatus.OK);
//
//           const removedDashboardItem = await DashboardItem.model
//             .findById({ _id: dashboardItem3._id });
//
//           expect(removedDashboardItem).to.be.eq(null);
//         });
//       });
//     });
//
//     describe('as Team User', () => {
//       before(cleanData);
//
//       before(makeTestData);
//       const agent = request.agent(app);
//       before(async () => {
//         await agent
//           .post('/api/v1/authentication')
//           .send({
//             login: email3,
//             password
//           });
//       });
//       describe('without dashboard items', () => {
//         it('should create dashboard item with correct sortableId', async () => {
//           const res = await agent
//             .post('/api/v1/dashboard/items')
//             .send({
//               type: 'question',
//               items: [
//                 question1._id.toString()
//               ]
//             }).expect(httpStatus.OK);
//
//           const dashboardItem = await DashboardItem.model
//             .findOne({ user: teamUser, question: question1, team })
//             .lean();
//
//           expect(dashboardItem.sortableId).to.be.eq(0);
//           expect(res.body.length).to.be.eq(1);
//         });
//       });
//
//       describe('with dashboard items', () => {
//         beforeEach(async () => {
//           [
//             dashboardItem2,
//             dashboardItem3
//           ] = await Promise.all([
//             dashboardItemFactory({ question: question2, sortableId: 0, user: teamUser }),
//             dashboardItemFactory({ question: question3, sortableId: 1, user: teamUser })
//           ]);
//         });
//         it('should update dashboard items with correct sortableId', async () => {
//           const res = await agent
//             .post('/api/v1/dashboard/items')
//             .send({
//               type: 'question',
//               items: [
//                 question3._id.toString(),
//                 question2._id.toString()
//               ]
//             }).expect(httpStatus.OK);
//
//           const updatedDashboardItem = await DashboardItem.model
//             .findById({ _id: dashboardItem2._id });
//
//           expect(updatedDashboardItem.sortableId).to.be.eq(1);
//           expect(res.body.length).to.be.eq(2);
//         });
//
//         it('should remove unnecessary dashboard items', async () => {
//           await agent
//             .post('/api/v1/dashboard/items')
//             .send({
//               type: 'question',
//               items: [
//                 question2._id.toString()
//               ]
//             }).expect(httpStatus.OK);
//
//           const removedDashboardItem = await DashboardItem.model
//             .findById({ _id: dashboardItem3._id });
//
//           expect(removedDashboardItem).to.be.eq(null);
//         });
//       });
//     });
//   });
//
//   describe('Unauthorized', () => {
//     it('should reject with unauthorized status', async () => {
//       await request(app)
//         .post('/api/v1/dashboard/items')
//         .send({
//           type: 'question',
//           items: [
//             question1._id.toString()
//           ]
//         }).expect(httpStatus.UNAUTHORIZED);
//     });
//   });
// });
