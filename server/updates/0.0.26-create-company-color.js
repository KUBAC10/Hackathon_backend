// models
import { CompanyColor, Company } from '../models';

// helpers
import {
  abortTransaction,
  commitTransaction,
  initSessionWithTransaction
} from '../helpers/transactions';

export default async function companyColor(done) {
  const session = await initSessionWithTransaction();
  try {
    const colors = await Promise.all([
      CompanyColor.model.create({
        value: '#1CEB9E',
        type: 'default',
      }),
      CompanyColor.model.create({
        value: '#3970D8',
        type: 'default',
      }),
      CompanyColor.model.create({
        value: '#A350F8',
        type: 'default',
      }),
      CompanyColor.model.create({
        value: '#00A4FA',
        type: 'default',
      }),
      CompanyColor.model.create({
        value: '#E7588E',
        type: 'default',
      }),
    ]);

    // updates companies
    const companies = await Company.model.find();
    if (!companies.length) return done();

    for (const company of companies) {
      for (const color of colors) {
        const newColor = new CompanyColor.model({
          value: color.value,
          type: 'company',
          company
        });
        await newColor.save({ session });
      }
    }

    // commit transaction
    commitTransaction(session)
      .then(() => done())
      .catch((e) => {
        console.error('Updates error: 0.0.26 create company colors', e);
        done(e);
      });
  } catch (e) {
    abortTransaction(session).then(() => {
      console.error('Updates error: create company colors', e);
      console.error(e);
      done(e);
    });
    console.error('Updates error: create company colors', e);
    done(e);
  }
}
