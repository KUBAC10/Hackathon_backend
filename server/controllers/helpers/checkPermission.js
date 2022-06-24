// TODO check scopes + create new rules to each endpoint? (via options)
// check user permissions to update/remove doc
export default function checkPermission(options = {}) {
  const { user, doc, customPermission } = options;

  if (customPermission) return customPermission(doc, user);

  switch (true) {
    // power user could update/remove any document in company
    case user.isPowerUser:
      return user.companyId.toString() === doc.company.toString();

    // forbid if broken data
    case !user || !user.currentTeam || !doc || !doc.team:
      return false;

    // TODO check!
    // team user could update/remove any document in current team
    case user.currentTeam.toString() === doc.team.toString():
      return true;
    default:
      return false;
  }
}
