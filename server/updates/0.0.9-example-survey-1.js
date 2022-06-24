import _ from 'lodash';
import uuid from 'uuid';
import faker from 'faker';
import moment from 'moment';
import async from 'async';

import {
  Company,
  Contact,
  Survey,
  SurveyItem,
  SurveyResult,
  SurveySection,
  Team,
  Question,
  QuestionItem,
  Invite,
  QuestionStatistic
} from '../models';

import {
  initSessionWithTransaction,
  abortTransaction,
  commitTransaction
} from '../helpers/transactions';

// create example survey to test company
export default async function exampleSurvey(done) {
  const session = await initSessionWithTransaction();

  try {
    // load test company
    let company = await Company.model.findOne({ name: 'Test Company' }).lean();

    // if company not found, try to load first company
    if (!company) {
      company = await Company.model.findOne().lean();
    }

    // if company is not present at all create new
    if (!company) {
      company = new Company.model({
        name: 'Test Company',
        urlName: _.deburr(_.kebabCase('Test Company')),
        email: 'email@example.com',
        address: {
          street: 'Test street, 0',
          zipCode: '0000',
          city: 'Test City'
        }
      });

      await company.save({ session });
    }

    // load test company first team
    let team = await Team.model.findOne({ name: 'First team', company: company._id });

    // if team not found, try to load first
    if (!team) {
      team = await Team.model.findOne({ company: company._id }).lean();
    }

    // if team is not present at all create new
    if (!team) {
      team = new Team.model({
        name: 'First team',
        description: 'Company first team',
        company: company._id
      });

      await team.save({ session });
    }

    // CREATE SURVEY
    const survey = new Survey.model({
      company,
      team,
      startDate: moment().subtract(3, 'month').toDate(),
      endDate: moment().add(1, 'month').toDate(),
      type: 'survey',
      translation: { en: true },
      name: { en: 'Example Survey 1' },
      urlName: _.deburr(_.kebabCase('Example Survey 1')),
      description: { en: 'Example Survey with fake data' }
    });

    await survey.save({ session });

    // CREATE SURVEY SECTIONS
    const [s1, s2, s3, s4] = await SurveySection.model.create([
      {
        company,
        team,
        survey,
        sortableId: 0,
        name: {
          en: 'Section 1'
        }
      },
      {
        company,
        team,
        survey,
        sortableId: 1,
        name: {
          en: 'Section 2'
        }
      },
      {
        company,
        team,
        survey,
        sortableId: 2,
        name: {
          en: 'Section 3'
        }
      },
      {
        company,
        team,
        survey,
        sortableId: 3,
        name: {
          en: 'Section 4'
        }
      }
    ], { session });

    // CREATE QUESTIONS
    const [q1, q2, q3, q4, q5, q6, q7, q8, q9, q10, q11, q12, q13, q14, q15, q16] =
      await Question.model.create([
        {
          company,
          team,
          type: 'multipleChoice',
          translation: { en: true },
          name: { en: 'MSD provides technology and tools to employees to positively support the value proposition' }
        },
        {
          company,
          team,
          type: 'multipleChoice',
          translation: { en: true },
          name: { en: 'You leverages available digital tools to their full extent' }
        },
        {
          company,
          team,
          type: 'multipleChoice',
          translation: { en: true },
          name: { en: 'MSD leverages state-of-art technology and tools better compared to other pharmaceutical companies' }
        },
        {
          company,
          team,
          type: 'text',
          translation: { en: true },
          name: { en: 'If you have any comment or suggestions about current Tools and Technologies state please left it' }
        },
        {
          company,
          team,
          type: 'multipleChoice',
          translation: { en: true },
          name: { en: 'MSD provides the appropriate trainings to employees to master the digital world' }
        },
        {
          company,
          team,
          type: 'multipleChoice',
          translation: { en: true },
          name: { en: 'You are actively educate yourself on "digital" topics related to your work' }
        },
        {
          company,
          team,
          type: 'multipleChoice',
          translation: { en: true },
          name: { en: 'MSD builds digital talent more actively compared to other Pharmaceutical companies' }
        },
        {
          company,
          team,
          type: 'text',
          translation: { en: true },
          name: { en: 'If you have any comment or wishes about current Trainings state please left it' }
        },
        {
          company,
          team,
          type: 'multipleChoice',
          translation: { en: true },
          name: { en: 'MSD empowers employees to challenge the status-duo' }
        },
        {
          company,
          team,
          type: 'multipleChoice',
          translation: { en: true },
          name: { en: 'You regularly test & learn through new ideas related to your work' }
        },
        {
          company,
          team,
          type: 'multipleChoice',
          translation: { en: true },
          name: { en: 'MSD recognizes external digital threat better than other pharmaceutical companies' }
        },
        {
          company,
          team,
          type: 'text',
          translation: { en: true },
          name: { en: 'If you have any comment or wishes about current Leadership & Culture state please left it' }
        },
        {
          company,
          team,
          type: 'multipleChoice',
          translation: { en: true },
          name: { en: 'MSD provides the resources and tools to create and deliver frequent, relevant and stand—out content to customers/stakeholders' }
        },
        {
          company,
          team,
          type: 'multipleChoice',
          translation: { en: true },
          name: { en: 'You publish regular content for MSD‘s Stakeholders/Customers related to yourwork' }
        },
        {
          company,
          team,
          type: 'multipleChoice',
          translation: { en: true },
          name: { en: 'MSD is better know to Stakeholders/Customers in relevant medical areas compared to other Pharmaceutical Companies' }
        },
        {
          company,
          team,
          type: 'text',
          translation: { en: true },
          name: { en: 'If you have any comment or wishes about current Content state please left it' }
        }
      ], { session });

    // CREATE QUESTIONS OPTIONS
    const questionsWithOptions = await Question.model
      .find({ type: 'multipleChoice' }, null, { session })
      .lean();

    for (const question of questionsWithOptions) {
      await QuestionItem.model.create([
        {
          company,
          team,
          question,
          sortableId: 0,
          name: { en: 'Strongly agree' }
        },
        {
          company,
          team,
          question,
          sortableId: 1,
          name: { en: 'Somewhat agree' }
        },
        {
          company,
          team,
          question,
          sortableId: 2,
          name: { en: 'Neither agree nor disagree' }
        },
        {
          company,
          team,
          question,
          sortableId: 3,
          name: { en: 'Somewhat disagree' }
        },
        {
          company,
          team,
          question,
          sortableId: 4,
          name: { en: 'Strongly disagree' }
        }
      ], { session });
    }

    // CREATE SURVEY ITEMS
    await SurveyItem.model.create([{
      company,
      team,
      survey,
      surveySection: s1._id,
      sortableId: 0,
      type: 'question',
      question: q1,
      required: true
    }], { session });

    await SurveyItem.model.create([{
      company,
      team,
      survey,
      surveySection: s1._id,
      sortableId: 1,
      type: 'question',
      question: q2,
      required: true
    }], { session });

    await SurveyItem.model.create([{
      company,
      team,
      survey,
      surveySection: s1._id,
      sortableId: 2,
      type: 'question',
      question: q3,
      required: true
    }], { session });

    await SurveyItem.model.create([{
      company,
      team,
      survey,
      surveySection: s1._id,
      sortableId: 3,
      type: 'question',
      question: q4
    }], { session });

    await SurveyItem.model.create([{
      company,
      team,
      survey,
      surveySection: s2._id,
      sortableId: 0,
      type: 'question',
      question: q5,
      required: true
    }], { session });

    await SurveyItem.model.create([{
      company,
      team,
      survey,
      surveySection: s2._id,
      sortableId: 1,
      type: 'question',
      question: q6,
      required: true
    }], { session });

    await SurveyItem.model.create([{
      company,
      team,
      survey,
      surveySection: s2._id,
      sortableId: 2,
      type: 'question',
      question: q7,
      required: true
    }], { session });

    await SurveyItem.model.create([{
      company,
      team,
      survey,
      surveySection: s2._id,
      sortableId: 3,
      type: 'question',
      question: q8
    }], { session });

    await SurveyItem.model.create([{
      company,
      team,
      survey,
      surveySection: s3._id,
      sortableId: 0,
      type: 'question',
      question: q9,
      required: true
    }], { session });

    await SurveyItem.model.create([{
      company,
      team,
      survey,
      surveySection: s3._id,
      sortableId: 1,
      type: 'question',
      question: q10,
      required: true
    }], { session });

    await SurveyItem.model.create([{
      company,
      team,
      survey,
      surveySection: s3._id,
      sortableId: 2,
      type: 'question',
      question: q11,
      required: true
    }], { session });

    await SurveyItem.model.create([{
      company,
      team,
      survey,
      surveySection: s3._id,
      sortableId: 3,
      type: 'question',
      question: q12
    }], { session });

    await SurveyItem.model.create([{
      company,
      team,
      survey,
      surveySection: s4._id,
      sortableId: 0,
      type: 'question',
      question: q13,
      required: true
    }], { session });

    await SurveyItem.model.create([{
      company,
      team,
      survey,
      surveySection: s4._id,
      sortableId: 1,
      type: 'question',
      question: q14,
      required: true
    }], { session });

    await SurveyItem.model.create([{
      company,
      team,
      survey,
      surveySection: s4._id,
      sortableId: 2,
      type: 'question',
      question: q15,
      required: true
    }], { session });

    await SurveyItem.model([{
      company,
      team,
      survey,
      surveySection: s4._id,
      sortableId: 3,
      type: 'question',
      question: q16
    }], { session });

    // CREATE CONTACTS
    const contacts = await Contact.model.create(
      [
        {
          company,
          team,
          name: { first: 'First', last: 'Contact' },
          email: 'email1@example.com'
        },
        {
          company,
          team,
          name: { first: 'Second', last: 'Contact' },
          email: 'email2@example.com'
        },
        {
          company,
          team,
          name: { first: 'Third', last: 'Contact' },
          email: 'email3@example.com'
        }
      ], { session }
    );

    // reload survey with all items and questions
    const surveyReload = await Survey.model
      .findById(survey._id, null, { session })
      .populate([
        {
          path: 'surveyItems',
          select: 'createdAt name team type visible html image sortableId localization',
          options: { sort: { sortableId: 1 }, session },
          match: { type: 'question' }, // load only question type
          populate: [
            {
              path: 'question',
              options: { session },
              select: 'createdAt name team type localization questionItems',
              populate: [
                {
                  path: 'questionItems',
                  select: 'value name createdAt localization',
                  options: { session }
                }
              ]
            }
          ]
        },
      ])
      .lean();

    // CREATE SURVEY RESULTS
    // create 500 responses splitted by last 3 month
    async.eachLimit(_.times(500), 5, (index, cb) => {
      const contact = _.sample(contacts);
      const token = uuid();

      // create invite
      const invite = new Invite.model({
        team,
        survey,
        company,
        contact,
        token
      });

      invite.save((err) => {
        if (err) return cb(err);
        // get random date
        const date = randomDate(moment().subtract(3, 'month').toDate(), new Date());

        // create survey result
        const surveyResult = new SurveyResult.model({
          survey,
          company,
          team,
          contact,
          token,
          createdAt: date
        });

        // create answer
        surveyResult.answer = surveyReload.surveyItems.reduce((acc, surveyItem) => {
          // handle text answer
          if (surveyItem.question.type === 'text') {
            acc[surveyItem._id] = {
              value: faker.lorem.sentence()
            };

            return acc;
          }

          // handle questions with question items
          acc[surveyItem._id] = {
            questionItems: [_.sample(surveyItem.question.questionItems)._id.toString()]
          };

          return acc;
        }, {});

        surveyResult.markModified('answer');
        surveyResult.save((err) => {
          if (err) return cb(err);

          // update question statistic entity for each question
          surveyReload.surveyItems.forEach((surveyItem) => {
            if (surveyItem.question.type !== 'text') {
              QuestionStatistic.model
                .update(
                  {
                    time: moment(date).startOf('hour').toDate(),
                    surveyItem: surveyItem._id,
                    question: surveyItem.question._id
                  },
                  { $set: { syncDB: false } },
                  { upsert: true }
                )
                .session(session)
                .catch(cb);
            }
          });

          cb();
        }, { session });
      }, { session });
    }, (err) => {
      if (err) {
        return abortTransaction(session).then(() => {
          console.error('Updates error: example-survey-1');
          console.error(err);
          done(err);
        });
      }
      // commit transaction
      commitTransaction(session)
        .then(() => done())
        .catch(er => console.log(er));
    });
  } catch (e) {
    abortTransaction(session).then(() => {
      console.error('Updates error: example-survey-1');
      console.error(e);
      done(e);
    });
  }
}

function randomDate(start, end) {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime())); // eslint-disable-line
}
