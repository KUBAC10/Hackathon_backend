import _ from 'lodash';
import { Company, Team, User, TeamUser, Country } from '../models';
import {
  initSessionWithTransaction,
  abortTransaction,
  commitTransaction
} from '../helpers/transactions';

// create test company, power-user, teams and users
export default async function testCompany(done) {
  const session = await initSessionWithTransaction();

  try {
    const countries = await Country.model.find().lean();
    const country = _.sample(countries);

    // create company
    const company = new Company.model({
      name: 'Test Company',
      urlName: _.deburr(_.kebabCase('Test Company')),
      email: 'email@example.com',
      address: {
        street: 'Test street, 0',
        zipCode: '0000',
        city: 'Test City',
        country
      }
    });
    await company.save({ session });

    // create power-user
    const powerUser = new User.model({
      name: {
        first: 'Power',
        last: 'User'
      },
      email: 'power_user@email.com',
      phoneNumber: '000000000001',
      password: '12345678a',
      address: {
        street: 'Power user street, 0',
        zipCode: '0000',
        city: 'Power User city',
        country
      },
      company: company._id,
      isPowerUser: true
    });
    await powerUser.save({ session });

    // create teams
    const team1 = new Team.model({
      name: 'First team',
      description: 'Company first team',
      company: company._id
    });
    await team1.save({ session });

    const team2 = new Team.model({
      name: 'Second team',
      description: 'Company second team',
      company: company._id
    });
    await team2.save({ session });

    // create company users
    const companyUser1 = new User.model({
      name: {
        first: 'User',
        last: 'First'
      },
      email: 'company_user1@email.com',
      phoneNumber: '000000000002',
      password: '12345678a',
      address: {
        street: 'Company User1 street, 0',
        zipCode: '0000',
        city: 'Company User1 city',
        country
      },
      company: company._id,
      currentTeam: team1._id
    });
    await companyUser1.save({ session });

    const companyUser2 = new User.model({
      name: {
        first: 'User',
        last: 'Second'
      },
      email: 'company_user2@email.com',
      phoneNumber: '000000000003',
      password: '12345678a',
      address: {
        street: 'Company User2 street, 0',
        zipCode: '0000',
        city: 'Company User2 city',
        country
      },
      company: company._id,
      currentTeam: team2._id
    });
    await companyUser2.save({ session });

    // assign users to teams
    const teamUser1 = new TeamUser.model({
      user: companyUser1._id,
      team: team1._id,
      company: company._id
    });
    await teamUser1.save({ session });
    const teamUser2 = new TeamUser.model({
      user: companyUser2._id,
      team: team2._id,
      company: company._id
    });
    await teamUser2.save({ session });

    // commit transaction
    await commitTransaction(session);
    done();
  } catch (e) {
    abortTransaction(session).then(() => {
      console.error('Updates error: test-company');
      console.error(e);
      done(e);
    });
  }
}
