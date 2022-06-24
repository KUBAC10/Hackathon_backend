import mongoose from 'mongoose';
import { TeamUser } from '../../models/index';

/**
 * --- Scopes ---
 * valid arguments - 'team', 'self', 'createdBy'
 * if valid argument is present, value extracted from headers would be added to req.scopes array
 */
export default function teamUser(...scopes) {
  return async (user, req, callback) => {
    const allowed = user.companyId && !user.isPowerUser;
    try {
      if (allowed) {
        // check user company id
        const companyId = user.companyId;

        // if user have no company - forbid access
        if (!companyId) return callback(null, false);

        // load team id from user current team
        const teamId = user.currentTeam;

        // if team is not present or value is not string - forbid access
        if (!teamId || (teamId && !mongoose.Types.ObjectId.isValid(teamId))) {
          return callback(null, false);
        }

        // apply company scope
        if (!req.scopes) req.scopes = {};
        req.scopes.company = user.companyId;

        // apply scopes
        if (scopes.length) {
          // team scope
          if (scopes.includes('team')) {
            // load team-user to check if he is exists
            const teamUser = await TeamUser.model
              .findOne({ user: user._id, team: teamId, company: companyId })
              .lean();

            // if team user is not present forbid access
            if (!teamUser) return callback(null, false);

            req.scopes.team = teamId;
          }

          // user self scope
          if (scopes.includes('self')) req.scopes.user = user._id;

          // created by user scope
          if (scopes.includes('createdBy')) req.scopes.createdBy = user._id;
        }
      }
      return callback(null, allowed);
    } catch (e) {
      /* istanbul ignore next */
      return callback(e);
    }
  };
}
