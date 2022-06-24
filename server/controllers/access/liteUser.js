export default function liteUser(...scopes) {
  return (user, req, callback) => {
    const allowed = user.companyId && user.isLite;
    // apply company scope
    if (allowed) {
      if (!req.scopes) req.scopes = {};
      req.scopes.company = user.companyId;
      if (scopes.includes('team')) req.scopes.team = user.currentTeam;

      // user self scope
      if (scopes.includes('self')) req.scopes.user = user._id;
    }
    return callback(null, allowed);
  };
}
