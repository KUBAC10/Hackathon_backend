import _ from 'lodash';

// merge draft data and original data, clear null values and reset draftData
export default function applyDraftData(doc) {
  // keep array of null values to set to undefined after merge
  const nullValues = [];

  // merge original doc with draft data
  _.mergeWith(doc, doc.draftData, (objValue, srcValue, key, object) => {
    // if data is array - return new values array
    if (_.isArray(srcValue)) return srcValue;
    // if null - keep obj and key and set undefined after merging
    if (_.isNull(srcValue)) {
      // push obj ref and key to null values array
      nullValues.push({ object, key });
      // return undefined to skip merging
      return undefined;
    }
  });

  // set to undefined null values
  nullValues.forEach((obj = {}) => {
    // check if value is present and set to undefined
    const { object, key } = obj;
    if (_.isNull(_.get(object, key))) object[key] = undefined;
  });

  // drop draft data and inDraft flag
  doc.draftData = {};
  doc.inDraft = false;
}
