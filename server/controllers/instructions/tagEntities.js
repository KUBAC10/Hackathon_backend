// access control
import accessControl from '../../helpers/accessControl';
import powerUser from '../access/powerUser';
import teamUser from '../access/teamUser';

export default {
  create: {
    auth: accessControl(powerUser(), teamUser()),
    select: 'createdAt tag contact'
  },
  destroy: {
    auth: accessControl(powerUser(), teamUser()),
    customPermission: (doc, user) => {
      // power user
      if (user.isPowerUser && user.companyId.toString() === doc.company.toString()) return true;
      // created by
      return doc.createdBy.toString() === user._id.toString();
    }
  }
};
