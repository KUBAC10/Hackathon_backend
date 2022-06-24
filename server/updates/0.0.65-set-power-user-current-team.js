import {
  TeamUser,
  User,
  Company,
  Team
} from '../models';

export default async function setPowerUserCurrentTeam(done) {
  try {
    const [
      user,
      company,
      team
    ] = await Promise.all([
      User.model.findOne({ isPowerUser: true }),
      Company.model.findOne().lean(),
      Team.model.findOne().lean()
    ]);

    let teamUser = await TeamUser.model.findOne({
      user: user._id,
      company: company._id,
      team: team._id
    });

    if (!teamUser) {
      user.currentTeam = team;

      teamUser = new TeamUser.model({
        company,
        team,
        user
      });

      await Promise.all([
        teamUser.save(),
        user.save()
      ]);
    }

    done();
  } catch (e) {
    console.error('Updates error: setPowerUserCurrentTeam');
    console.error(e);
    done(e);
  }
}
