export default function templateMaker() {
  return (user, req, callback) => {
    const allowed = !!user.isTemplateMaker;

    if (allowed) {
      req.scopes = {};
      req.scopes.company = user.companyId;
      req.scopes.team = user.currentTeam;
    }

    callback(null, allowed);
  };
}
