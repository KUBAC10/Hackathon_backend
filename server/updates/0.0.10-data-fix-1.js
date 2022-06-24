import _ from 'lodash';
import uuid from 'uuid';
import async from 'async';
import { Company, Invite, Survey, SurveyResult } from '../models';
import {
  initSessionWithTransaction,
  abortTransaction,
  commitTransaction
} from '../helpers/transactions';

export default async function testCompany(done) {
  const session = await initSessionWithTransaction();

  try {
    // set companies url names
    const companies = await Company.model.find();
    for (const company of companies) {
      if (!company.urlName) {
        company.urlName = _.deburr(_.kebabCase(company.name));
      }
      await company.save({ session });
    }

    // set survey url names
    const surveys = await Survey.model.find();
    for (const survey of surveys) {
      if (!survey.urlName) {
        survey.urlName = _.deburr(_.kebabCase(survey.name.en));
      }
      await survey.save({ session });
    }

    // create and set invite for each result
    const results = await SurveyResult.model.find().populate('invite');
    async.eachLimit(results, 5, (result, cb) => {
      // set tokens
      if (!result.invite) {
        const token = uuid();
        result.token = token;
        result.save((err) => {
          if (err) return cb(err);

          // create invite with token and result contact
          const invite = new Invite.model({
            token,
            survey: result.survey,
            contact: result.contact,
            company: result.company,
            team: result.team
          });

          invite.save((err) => {
            if (err) return cb(err);
            cb();
          }, { session });
        }, { session });
      } else {
        setTimeout(cb, 0);
      }
    }, (err) => {
      if (err) {
        return abortTransaction(session).then(() => {
          console.error('Updates error: data-fix-1');
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
      console.error('Updates error: data-fix-1');
      console.error(e);
      done(e);
    });
  }
}
