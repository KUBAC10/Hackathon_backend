import _ from 'lodash';

export default async function handleSortableId(doc, schema) {
  try {
    const {
      _addDefaultItem,
      _addAfterDefined,
      _moveItem,
      _cloneDraftSurveyItem,
      _driverDuplicate
    } = doc;

    if (doc._skipHandleSortableId) return;

    // skip sortableId handling on cloning
    if (
      !_addDefaultItem &&
      !_addAfterDefined &&
      !_moveItem &&
      !_cloneDraftSurveyItem &&
      !_driverDuplicate
    ) return;

    // load all list
    const docs = await schema.model
      .find(_getQuery(doc))
      .select('sortableId draftData.sortableId draftRemove inTrash')
      .lean();

    // sort docs
    const items = docs
      .map(i => ({ ...i, ...i.draftData }))
      .sort((a, b) => (a.sortableId - b.sortableId));

    // calculate and set new sortableId on creation
    if (doc._addDefaultItem) {
      // keep defaultSortableId if no items or set sortable id for last item
      _.set(doc, 'draftData.sortableId', items.length ? items.pop().sortableId + 1 : 0);
      doc.markModified('draftData.sortableId');

      return;
    }

    //  calculate sortableId to move item into passed, through index value, position
    if (_moveItem) {
      doc.draftData.sortableId = _calculateSortableId(doc, items, doc.draftData.index);
      doc.markModified('draftData.sortableId');

      return;
    }

    // calculate and set a new sortableId to put item after passed into index value position
    if (_addAfterDefined) {
      const index = doc.draftData.index;
      const filteredItems = items.filter(i => !i.draftRemove && !i.inTrash);
      const curr = _.get(filteredItems, `[${index}].sortableId`) || 0;
      const currIndex = items.findIndex(i => i.sortableId === curr);
      const next = _.get(items, `[${currIndex + 1}].sortableId`);

      if (next !== undefined) {
        doc.draftData.sortableId = next - (Math.abs(next - curr) / 2);

        return;
      }

      doc.draftData.sortableId = items.length ? items.pop().sortableId + 1 : 0;
    }

    // allows to set a correct sortableId value for surveyItems during clone procedure in draft
    if (_cloneDraftSurveyItem) {
      const filteredItems = items.filter(i => !i.draftRemove && !i.inTrash);
      // get the source surveyItem index from filtered list
      const filteredIndex = filteredItems.findIndex(i => i.sortableId === doc.draftData.sortableId);
      const curr = _.get(filteredItems, `[${filteredIndex}].sortableId`);
      //  current index in all items list to calculate correct sortableId for different stages
      const currIndex = items.findIndex(i => i.sortableId === curr);
      const next = _.get(items, `[${currIndex + 1}].sortableId`);

      //  if next item exists and new position is between current and next position
      if (next !== undefined) {
        doc.draftData.sortableId = curr + (Math.abs(next - curr) / 2);
        return;
      }

      // if source item is a last one in a section
      doc.draftData.sortableId = curr + 1;
    }

    // set correct sortableId on driver cloning
    if (_driverDuplicate) {
      const curr = _.get(doc, 'draftData.sortableId', doc.sortableId);
      const next = items.find(i => _.get(i, 'draftData.sortableId', i.sortableId) > curr);

      if (next) {
        const nextSortableId = _.get(next, 'draftData.sortableId', next.sortableId);

        _.set(doc, 'draftData.sortableId', curr + (Math.abs(nextSortableId - curr) / 2));
      } else {
        _.set(doc, 'draftData.sortableId', curr + 1);
      }

      _.set(doc, 'sortableId', doc.draftData.sortableId);
    }
  } catch (e) {
    return Promise.reject(e);
  }
}

function _calculateSortableId(doc, items, itemIndex) {
  const index = parseInt(itemIndex, 10);
  const filteredItems = items.filter(i => !i.draftRemove && !i.inTrash);

  // calculate and returns sortableId to put item before the first existing position
  if (itemIndex === -1) return items[0].sortableId - 1;

  if (index === 0) return items[index].sortableId - 1;

  if (index >= items.length - 1) return items.pop().sortableId + 1;

  const curr = _.get(filteredItems, `[${index}].sortableId`);

  const currIndex = items.findIndex(i => i.sortableId === curr);

  const prev = _.get(items, `[${currIndex - 1}].sortableId`);

  const next = _.get(items, `[${currIndex + 1}].sortableId`);

  if (next === undefined) return items.pop().sortableId + 1;

  // set sortableId between existing items
  // find the difference between two sortableIds
  // and add divide by two to previous sortableId
  if (items.findIndex(i => i._id.toString() === doc._id.toString()) > index) {
    return prev + (Math.abs(curr - prev) / 2);
  }

  return next - (Math.abs(next - curr) / 2);
}

function _getQuery(doc) {
  const {
    survey,
    surveySection,
    type,
    surveyItem,
    flowLogic,
    question
  } = _.merge(doc.toObject(), doc.draftData);

  switch (doc.schema.options.collection) {
    case 'PulseSurveyDriver':
    case 'SurveySection':
      return { survey };
    case 'SurveyItem':
      return {
        $or: [
          { 'draftData.surveySection': surveySection },
          { surveySection, 'draftData.surveySection': { $exists: false } }
        ]
      };
    case 'ContentItem': {
      if (type === 'content') {
        return {
          type,
          $or: [
            { 'draftData.surveyItem': surveyItem },
            { surveyItem, 'draftData.surveyItem': { $exists: false } }
          ]
        };
      }

      return { type, survey };
    }
    case 'FlowLogic':
      return { surveyItem };
    case 'FlowItem': {
      return { flowLogic };
    }
    case 'QuestionItem':
    case 'GridColumn':
    case 'GridRow':
      return { question };
    default:
      return {};
  }
}
