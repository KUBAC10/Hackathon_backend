import httpStatus from 'http-status';

// models
import {
  Team,
  User,
  TeamUser
} from '../../../models';

// helpers
import { initSession } from '../../../helpers/transactions';

/** POST /api/v1/team/:id/add-team-users */
async function addTeamUsers(req, res, next) {
  try {
    const session = await initSession();

    const { id } = req.params;
    const { users } = req.body;
    const { companyId: company } = req.user;

    // load team
    const team = await Team.model.findOne({ _id: id, company });
    if (!team) return res.sendStatus(400);

    const teamUsers = [];
    await session.withTransaction(async () => {
      for (const user of users) {
        // load user - check if valid
        const userDoc = await User.model
          .findOne({ _id: user, company })
          .lean();
        if (!userDoc) return;

        // check if teamUser is already present
        let teamUser = await TeamUser.model
          .findOne({ user, team, company })
          .lean();
        if (teamUser) return;

        // create new teamUser
        teamUser = new TeamUser.model({
          team,
          user,
          company
        });

        teamUser._req_user = { _id: req.user._id };

        await teamUser.save({ session });

        teamUsers.push(teamUser);
      }
    });

    return res.send(teamUsers);
  } catch (e) {
    return next(e);
  }
}

/** DELETE /api/v1/team/:id - remove team */
async function destroy(req, res, next) {
  const session = await initSession();

  try {
    const { id } = req.params;
    const { companyId: company } = req.user;

    const team = await Team.model
      .findOne({
        company,
        _id: id,
        inTrash: { $ne: true }
      });

    if (!team) return res.sendStatus(httpStatus.NOT_FOUND);

    const teamsCount = await Team.model
      .find({
        company,
        _id: { $ne: team._id },
        inTrash: { $ne: true }
      })
      .countDocuments();

    // forbid to remove last team in company
    if (!teamsCount) return res.sendStatus(httpStatus.FORBIDDEN);

    await session.withTransaction(async () => await team.softDelete({ session }));

    return res.sendStatus(httpStatus.NO_CONTENT);
  } catch (e) {
    return next(e);
  }
}

export default {
  addTeamUsers,
  destroy
};
