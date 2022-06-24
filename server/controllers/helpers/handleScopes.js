import _ from 'lodash';

// apply scopes after access control
// if scope is not present in obj - add it
export default async function handleScopes(options = {}) {
  const { reqScopes, checkScope, query = {}, doc = {} } = options;

  // handle request scopes and assign it to query and doc
  Object.keys(reqScopes).forEach((scope) => {
    // assign scope value if it not exist in doc or query
    if (!doc[scope]) doc[scope] = reqScopes[scope];
    if (!query[scope]) query[scope] = reqScopes[scope];
  });

  // TODO rebuild query.type === 'template' logic
  if ((query.type === 'template' || checkScope) && reqScopes.company) {
    const companyTeam = _.pick(query, ['company', 'team']);

    _.unset(query, 'company');
    _.unset(query, 'team');

    if (query.$or) {
      query.$and = [
        { $or: query.$or },
        {
          $or: [
            companyTeam,
            { 'scope.global': true },
            { 'scope.companies': companyTeam.company }
          ]
        },
      ];

      delete query.$or;
    } else {
      query.$or = [
        companyTeam,
        { 'scope.global': true },
        { 'scope.companies': companyTeam.company }
      ];
    }
  }
}
