import keystone from 'keystone';
import httpStatus from 'http-status';
import _ from 'lodash';
import APIError from '../APIError';

export default function setKeystoneList(req, res, next) {
  if (!keystone.lists[keystone.paths[req.params.list]]) {
    const err = new APIError('API not found', httpStatus.NOT_FOUND);
    return next(err);
  }
  req.params.list = _.camelCase(req.params.list);
  next();
}
