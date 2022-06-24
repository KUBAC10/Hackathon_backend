// models
import {
  Question,
  FlowItem
} from '../models';

export default async function removeButtonQuestionType(done) {
  try {
    await Promise.all([
      Question.model.updateMany({ type: 'button', 'configuration.multiple': true }, { type: 'checkboxes' }),
      Question.model.updateMany({ type: 'button', 'configuration.multiple': false }, { type: 'multipleChoice' })
    ]);

    const flowItems = await FlowItem.model
      .find({ questionType: 'button' })
      .populate('question');

    for (const flowItem of flowItems) {
      if (flowItem.question && flowItem.question.type) {
        flowItem.questionType = flowItem.question.type;

        await flowItem.save();
      }
    }

    done();
  } catch (e) {
    console.log('Update error: removeButtonQuestionType');

    return done(e);
  }
}
