// models
import {
  Survey
} from '../../models';

export default async function setInDraftTrigger(surveyId, session) {
  try {
    await Survey.model.updateOne({
      _id: surveyId,
      inDraft: false
    },
    {
      $set: {
        inDraft: true
      }
    },
    { session });
  } catch (e) {
    return Promise.reject(e);
  }
}

