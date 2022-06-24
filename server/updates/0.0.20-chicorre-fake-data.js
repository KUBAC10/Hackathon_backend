// import _ from 'lodash';
// import faker from 'faker';
// import uuid from 'uuid';
// import async from 'async';
// import moment from 'moment';
//
// // models
// import {
//   Team,
//   Survey,
//   Company,
//   SurveyResult
// } from '../models';
//
// // helpers
// import {
//   initSessionWithTransaction,
//   abortTransaction,
//   commitTransaction
// } from '../helpers/transactions';

/** production fake data creation for survey 5ced149cdbb7ea16e6e364a7 */
export default async function productionFakeData(done) {
  // const session = await initSessionWithTransaction();
  try {
    // // load test company
    // const company = await Company.model.findOne({ name: 'Chicoree' }).lean();
    // if (!company) return done();
    // // load team
    // const team = await Team.model.findOne({ name: 'Chicoree Team', company: company._id });
    // if (!team) return done();
    //
    // // survey - 5ced149cdbb7ea16e6e364a7
    // const survey = await Survey.model
    //   .findById('5ced149cdbb7ea16e6e364a7')
    //   .populate([
    //     {
    //       path: 'surveyItems',
    //       select: '-createdAt -updatedAt -__v',
    //       match: { type: { $ne: 'html' } },
    //       populate: [
    //         {
    //           path: 'question',
    //           select: '-createdAt -updatedAt -__v',
    //           populate: [
    //             {
    //               path: 'questionItems',
    //               select: '-createdAt -updatedAt -__v'
    //             }
    //           ]
    //         }
    //       ]
    //     }
    //   ])
    //   .lean();
    // if (!survey) return done();
    //
    // // create fake data for first survey - PUBLIC
    // // create 2000 responses splitted by last 3 month
    // async.eachLimit(_.times(2000), 5, (index, cb) => {
    //   const fingerprintId = uuid();
    //   const surveyResult = new SurveyResult.model({
    //     team,
    //     survey,
    //     company,
    //     fingerprintId,
    //     completed: true
    //   });
    //
    //   surveyResult.save((err) => {
    //     if (err) return cb(err);
    //
    //     const surveyResultItemsArr = survey.surveyItems.map((surveyItem) => {
    //       const date = randomDate(moment().subtract(3, 'month').toDate(), new Date());
    //
    //       if (surveyItem.question.type === 'text') {
    //         return {
    //           company: company._id,
    //           survey: survey._id,
    //           team: team._id,
    //           surveyItem: surveyItem._id,
    //           surveyResult: surveyResult._id,
    //           question: surveyItem.question._id,
    //           value: faker.lorem.sentence(),
    //           createdAt: date,
    //           updatedAt: date
    //         };
    //       }
    //
    //       if (surveyItem.question.type === 'linearScale') {
    //         const linearScaleRange = _.range(
    //           surveyItem.question.linearScale.from,
    //           surveyItem.question.linearScale.to + 1
    //         );
    //
    //         return {
    //           company: company._id,
    //           survey: survey._id,
    //           team: team._id,
    //           surveyItem: surveyItem._id,
    //           surveyResult: surveyResult._id,
    //           question: surveyItem.question._id,
    //           value: _.sample(linearScaleRange),
    //           createdAt: date,
    //           updatedAt: date
    //         };
    //       }
    //
    //       // handle questions with question items
    //       return {
    //         company: company._id,
    //         survey: survey._id,
    //         team: team._id,
    //         surveyItem: surveyItem._id,
    //         surveyResult: surveyResult._id,
    //         question: surveyItem.question._id,
    //         questionItems: _.sample(surveyItem.question.questionItems),
    //         createdAt: date,
    //         updatedAt: date
    //       };
    //     });
    //   }, { session });
    // }, (err) => {
    //   if (err) {
    //     return abortTransaction(session).then(() => {
    //       console.error('Updates error: production-fake-data-1');
    //       console.error(err);
    //       done(err);
    //     });
    //   }
    //   // commit transaction
    //   commitTransaction(session)
    //     .then(() => done())
    //     .catch(er => console.log(er));
    // });

    done();
  } catch (e) {
    // abortTransaction(session).then(() => {
    //   console.error('Updates error: Chicoree fake data');
    //   console.error(e);
    //   done(e);
    // });
  }
}

// function randomDate(start, end) {
//   return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
// }
