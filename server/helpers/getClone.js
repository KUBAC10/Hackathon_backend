import uuid from 'uuid';
import mongoose from 'mongoose';
import _ from 'lodash';

const isValid = mongoose.Types.ObjectId.isValid;

/**
 * Function return cloning survey object
 * with refreshed uuid, to create new survey
 * @param  {object} - Survey object with populated entities
 * @return {object} - Cloned survey object
 */
export default function getClone(obj) {
  const pairs = []; // Array of object with _id-uuid pairs to replace

  // refresh uuid and fill pairs
  let clone = _.cloneDeepWith(obj, (item) => {
    if (_.has(item, '_id') && _.has(item, 'uuid')) {
      item.uuid = uuid();
      pairs.push({ _id: item._id.toString(), uuid: item.uuid });
      delete item._id;
    }
  });

  // replace objectIds from pairs
  clone = _.cloneDeepWith(clone, (item) => {
    if (isValid(item) && pairs.find(p => p._id.toString() === item.toString())) {
      return pairs.find(p => p._id.toString() === item.toString()).uuid;
    }
  });

  // clean _ids
  clone = _.cloneDeepWith(clone, (item) => {
    if (_.has(item, '_id') && !(item.general || item.trend)) delete item._id;
  });

  return clone;
}
