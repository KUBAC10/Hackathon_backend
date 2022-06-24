import keystone from 'keystone';
import moment from 'moment';
import async from 'async';
import _ from 'lodash';
import mongoose from 'mongoose';

// models
import {
  QuestionStatistic,
  SurveyItem,
  SurveyResult,
  ContentItemElement
} from './index';

const Types = keystone.Field.Types;
const ValidationError = mongoose.Error.ValidationError;
const ValidatorError = mongoose.Error.ValidatorError;

export const relationTypes = ['team', 'survey', 'template', 'surveyItem', 'contentItem', 'question', 'questionItem', 'gridRow', 'gridColumn'];

/**
 * Trash Model
 * ===========
 */
const Trash = new keystone.List('Trash', {
  track: true,
  defaultSort: '-createdAt'
});

Trash.add({
  company: {
    type: Types.Relationship,
    ref: 'Company',
    initial: true,
    required: true
  },
  team: {
    type: Types.Relationship,
    ref: 'Team',
    initial: true
  },
  type: {
    type: Types.Select,
    initial: true,
    required: true,
    // TODO remove users?
    options: relationTypes
  },
  stage: {
    type: Types.Select,
    initial: true,
    required: true,
    options: 'initial, clearing, inDraft',
    default: 'initial'
  },
  draft: {
    type: Types.Relationship,
    ref: 'Survey'
  },
  attempts: {
    type: Number,
    default: 0
  },
  survey: {
    type: Types.Relationship,
    ref: 'Survey',
    initial: true
  },
  surveyItem: {
    type: Types.Relationship,
    ref: 'SurveyItem',
    initial: true,
  },
  question: {
    type: Types.Relationship,
    ref: 'Question',
    initial: true
  },
  questionItem: {
    type: Types.Relationship,
    ref: 'QuestionItem',
    initial: true
  },
  gridRow: {
    type: Types.Relationship,
    ref: 'GridRow',
    initial: true
  },
  gridColumn: {
    type: Types.Relationship,
    ref: 'GridColumn',
    initial: true
  },
  contentItem: {
    type: Types.Relationship,
    ref: 'ContentItem',
    initial: true
  },
  expireDate: {
    type: Types.Date,
    required: true,
    initial: true,
    utc: true,
    default: moment().add(1, 'week').toDate(),
    note: 'Time to run cron to clearing entity'
  },
  parentRecord: {
    type: Types.Relationship,
    ref: 'Trash',
    initial: true,
    note: 'If item is created while processing another "Trash" item'
  }
});

// set virtuals
Trash.schema.virtual('list').get(function () {
  switch (this.type) {
    case 'survey':
    case 'template':
      return 'Survey';
    case 'question':
      return 'Question';
    case 'surveyItem':
      return 'SurveyItem';
    case 'questionItem':
      return 'QuestionItem';
    case 'gridColumn':
      return 'GridColumn';
    case 'gridRow':
      return 'GridRow';
    case 'contentItem':
      return 'ContentItem';
    default:
      return null;
  }
});

Trash.schema.virtual('entity').get(function () {
  switch (this.type) {
    case 'survey':
    case 'template':
      return this.survey;
    case 'question':
      return this.question;
    case 'surveyItem':
      return this.surveyItem;
    case 'questionItem':
      return this.questionItem;
    case 'gridColumn':
      return this.gridColumn;
    case 'gridRow':
      return this.gridRow;
    case 'contentItem':
      return this.contentItem;
    default:
      return null;
  }
});

// if item is created from another "Trash" item, set stage as 'clearing'
Trash.schema.pre('save', function (next) {
  if (this.isNew && this.parentRecord) {
    this.stage = 'clearing';
  }
  next();
});

// restore item from trash and return it
Trash.schema.methods.restore = async function (options = {}) {
  try {
    if (this.stage === 'clearing') {
      const error = new ValidationError(this);
      error.errors.stage = new ValidatorError({ message: 'You already can not restore this item' });
      return Promise.reject(error);
    }

    // load trash item
    const item = await keystone.lists[this.list].model.findById(this.entity);

    // update item inTrash field
    item.inTrash = false;

    if (this.stage === 'inDraft') item.draftRemove = false;

    // if type is surveyItem restore to current section of survey or to the last
    if (this.type === 'surveyItem') {
      // check if section is still present
      const SurveySection = keystone.lists.SurveySection;
      const sectionId = _.get(item, 'draftData.surveySection', item.surveySection);

      const surveySection = await SurveySection.model
        .findOne({ _id: sectionId, draftRemove: { $ne: true } })
        .lean();

      // if section is not present - try to restore item to the last section of survey
      if (!surveySection) {
        const surveySections = await SurveySection.model
          .find({ survey: item.survey, draftRemove: { $ne: true } })
          .lean();

        const [lastSection] = surveySections
          .map(s => ({ ...s, ...s.draftData || {} }))
          .sort((a, b) => b.sortableId - a.sortableId);

        if (lastSection) {
          item.surveySection = lastSection._id;

          if (!item.draftData) item.draftData = {};

          item._addDefaultItem = true;
          item.draftData.surveySection = lastSection._id;
          item.markModified('draftData.surveySection');
        } else {
          // if there is no sections in survey raise error
          const error = new ValidationError(this);
          error.errors.surveySection = new ValidatorError({ message: 'Need to have section to restore' });
          return Promise.reject(error);
        }
      }
    }

    // if type content item restore to current contents survey item
    // last or create new survey item contents
    if (this.type === 'contentItem' && item.type === 'content') {
      const { SurveySection, SurveyItem } = keystone.lists;

      // get current surveyItem contents
      const surveyItem = await SurveyItem.model
        .findOne({
          _id: _.get(item, 'draftData.surveyItem', item.surveyItem),
          type: 'contents',
          inTrash: { $ne: true }
        })
        .populate('surveySection')
        .select('_id draftRemove surveySection');

      // restore survey item
      if (surveyItem && surveyItem.draftRemove && !surveyItem.surveySection.draftRemove) {
        surveyItem._addDefaultItem = true;
        surveyItem.draftRemove = undefined;
        item._addDefaultItem = true;
        item.draftRemove = undefined;

        await surveyItem.save({ session: options.session });
      }

      if (!surveyItem || surveyItem.draftRemove) {
        const surveySections = await SurveySection.model
          .find({ survey: item.survey, draftRemove: { $ne: true } })
          .populate({
            path: 'surveyItems',
            match: {
              inTrash: { $ne: true },
              draftRemove: { $ne: true }
            }
          })
          .lean();

        const [lastSection] = surveySections
          .map(s => ({ ...s, ...s.draftData || {} }))
          .sort((a, b) => b.sortableId - a.sortableId);

        // get last survey item in section
        let [lastSurveyItem] = lastSection.surveyItems
          .map(i => ({ ...i, ...i.draftData || {} }))
          .sort((a, b) => b.sortableId - a.sortableId);

        // if last survey item not content type add new survey item
        if (!lastSurveyItem || _.get(lastSurveyItem, 'type') !== 'contents') {
          const { team, company, survey } = lastSection;

          lastSurveyItem = new SurveyItem.model({
            team,
            company,
            survey,
            inDraft: true,
            type: 'contents',
            surveySection: lastSection,
            sortableId: lastSurveyItem ? lastSurveyItem.sortableId + 1 : 0
          });
          lastSurveyItem._addDefaultItem = true;

          await lastSurveyItem.save({ session: options.session });
        }

        _.set(item, 'draftData.surveyItem', lastSurveyItem._id);

        item._addDefaultItem = true;
        item.markModified('draftData.surveyItem');
      }
    }

    if (this.type === 'contentItem' && ['startPage', 'endPage'].includes(item.type)) {
      const { ContentItem } = keystone.lists;

      // find pages in survey
      const defaultPage = await ContentItem.model.find({
        survey: item.survey,
        type: item.type,
        $or: [
          { default: true, 'draftData.default': { $exists: false } },
          { 'draftData.default': true }
        ]
      });

      if (!defaultPage.length) {
        _.set(item, 'draftData.default', true);

        item.markModified('draftData.default');
      }
    }

    await item.save({ session: options.session });

    // delete trash record
    await this.remove();

    return item;
  } catch (e) {
    return Promise.reject(e);
  }
};

// remove entity and all related data from database without session
Trash.schema.methods.clear = async function () {
  try {
    if (this.stage !== 'clearing') {
      const error = new ValidationError(this);

      error.errors.stage = new ValidatorError({ message: 'You already can not restore this item' });

      return Promise.reject(error);
    }

    if (this.attempts > 20) {
      const error = new ValidationError(this);

      error.errors.attempts = new ValidatorError({ message: 'Too much attempts to clear' });

      return Promise.reject(error);
    }

    // models
    const {
      SurveyResult, DashboardItem, Question, QuestionItem,
      Invite, Survey, SurveySection, SurveyItem, TagEntity,
      QuestionStatistic, GridRow, GridColumn,
      ContentItem, FlowItem, SurveyTheme, FlowLogic,
      Team, User, Tag, Email, TeamUser, Asset, Contact
    } = keystone.lists;

    let entity;

    // handle team clearing
    if (this.type === 'team' && this.team) {
      entity = await Team.model.findOne({ _id: this.team });

      const [
        surveys,
        questions,
        users,
        tags
      ] = await Promise.all([
        Survey.model.find({
          team: this.team
        }),
        Question.model.find({
          team: this.team,
          $or: [
            { trend: true },
            { general: true }
          ]
        }),
        User.model
          .find({ currentTeam: this.team })
          .populate('userTeams'),
        Tag.model.find({
          team: this.team
        })
      ]);

      // soft delete all surveys and questions
      for (const entity of [...surveys, ...questions]) {
        await entity.softDelete({ parentRecord: this._id });
      }

      // switch users to another team if exists
      for (const user of users) {
        const { userTeams } = user;

        const newCurrentTeam = userTeams.find(i => i.team.toString() !== this.team.toString());

        user.currentTeam = _.get(newCurrentTeam, 'team');

        await user.save();
      }

      // remove tags and tag entities
      for (const tag of tags) {
        await tag.remove();
      }

      // remove related entities
      await Promise.all([
        // email
        Email.model.deleteMany({ team: this.team }),
        // team users
        TeamUser.model.deleteMany({ team: this.team }),
        // asset
        Asset.model.deleteMany({ team: this.team }),
        // contact
        Contact.model.deleteMany({ team: this.team })
      ]);
    }

    // handle survey and templates clearing
    if ((this.type === 'survey' || this.type === 'template') && this.survey) {
      entity = await Survey.model.findById(this.survey);

      // remove related entities
      await Promise.all([
        // sections
        SurveySection.model.deleteMany({ survey: this.survey }),

        // results
        SurveyResult.model.deleteMany({ survey: this.survey }),

        // invites
        Invite.model.deleteMany({ survey: this.survey }),

        // dashboard items
        DashboardItem.model.deleteMany({ survey: this.survey }),

        // tag entity
        TagEntity.model.deleteMany({ survey: this.survey }),

        // survey theme
        SurveyTheme.model.deleteMany({ survey: this.survey })
      ]);

      // soft delete survey items
      const [
        surveyItems,
        contentItems
      ] = await Promise.all([
        SurveyItem.model.find({ survey: this.survey }),
        ContentItem.model.find({ survey: this.survey })
      ]);

      await async.eachLimit([...surveyItems, ...contentItems], 5, (item, cb) => {
        item.softDelete({ parentRecord: this._id, stage: 'clearing' })
          .then(() => cb())
          .catch(cb);
      });
    }

    // handle surveyItem clearing
    if (this.type === 'surveyItem' && this.surveyItem) {
      entity = await SurveyItem.model
        .findById(this.surveyItem)
        .populate('question');

      // remove related entities
      await Promise.all([
        FlowLogic.model.deleteMany({ surveyItem: this.surveyItem }),
        QuestionStatistic.model.deleteMany({ surveyItem: this.surveyItem }),
      ]);

      // soft delete question, if present and not trend
      if (entity.type === 'question' && !entity.question.trend) {
        await entity.question.softDelete({ parentRecord: this._id, stage: 'clearing' });
      }

      // soft delete contentItems
      if (entity.type === 'contents') {
        const contents = await ContentItem.model.find({ surveyItem: this.surveyItem });

        await async.eachLimit(contents, 5, (content, cb) => {
          content.softDelete({ parentRecord: this._id, stage: 'clearing' })
            .then(() => cb())
            .catch(cb);
        });
      }
    }

    // handle question clearing
    if (this.type === 'question' && this.question) {
      entity = await Question.model.findById(this.question);

      if (entity.trend) await _cloneAndReplaceQuestionIds(entity);

      // remove related entities
      await Promise.all([
        // question items
        QuestionItem.model.deleteMany({ question: this.question }),

        // dashboard items
        DashboardItem.model.deleteMany({ question: this.question }),

        // tag entity
        TagEntity.model.deleteMany({ question: this.question }),

        // grid row
        GridRow.model.deleteMany({ question: this.question }),

        // grid column
        GridColumn.model.deleteMany({ question: this.question }),

        // question statistics
        QuestionStatistic.model.deleteMany({ question: this.question }),

        // survey items
        SurveyItem.model.deleteMany({ question: this.question }),
      ]);
    }

    // handle contentItem clearing
    if (this.type === 'contentItem' && this.contentItem) {
      entity = await ContentItem.model.findById(this.contentItem);

      if (entity.type === 'endPage') {
        await FlowItem.model.deleteMany({ endPage: this.contentItem });
        await ContentItemElement.model.deleteMany({ contentItem: this.contentItem });
      }
    }


    // handle questionItem clearing
    if (this.type === 'questionItem' && this.questionItem) {
      entity = await QuestionItem.model.findById(this.questionItem);
    }

    // handle gridRow clearing
    if (this.type === 'gridRow' && this.gridRow) {
      entity = await GridRow.model.findById(this.gridRow);
    }

    // handle gridColumn clearing
    if (this.type === 'gridColumn' && this.gridColumn) {
      entity = await GridColumn.model.findById(this.gridColumn);
    }

    // finalize remove of entity, remove from database, trigger item "pre" and "post" remove hooks
    if (entity) await entity.remove();

    // TODO add trash-history?
    // remove trash record
    await this.remove();
  } catch (e) {
    // if error occurred increment attempts counter
    this.attempts += 1;
    await this.save();
    return Promise.reject(e);
  }
};

Trash.defaultColumns = 'type, stage, expireDate, completedAt';
Trash.register();

async function _cloneAndReplaceQuestionIds(question) {
  try {
    const itemTypes = ['multipleChoice', 'checkboxes', 'dropdown'];
    const matrixTypes = ['multipleChoiceMatrix', 'checkboxMatrix'];

    const surveyItems = await SurveyItem.model
      .find({ question: question._id });

    for (const surveyItem of surveyItems) {
      const ids = {};
      const clonedQuestion = await question.getClone({ ids, replaceTrend: true });

      if ([...itemTypes, ...matrixTypes].includes(question.type)) {
        const cursor = SurveyResult.model
          .find({
            survey: surveyItem.survey,
            [`answer.${surveyItem._id}`]: { $exists: true }
          })
          .cursor();

        for (let result = await cursor.next(); result != null; result = await cursor.next()) {
          if (itemTypes.includes(question.type)) {
            result.answer[surveyItem._id].questionItems =
              result.answer[surveyItem._id].questionItems.map(i => ids[i]);
          }

          if (matrixTypes.includes(question.type)) {
            result.answer[surveyItem._id].crossings =
              result.answer[surveyItem._id].crossings.map(c => ({
                gridRow: ids[c.gridRow],
                gridColumn: ids[c.gridColumn]
              }));
          }

          result.markModified('answer');

          await result.save();
        }
      }

      await QuestionStatistic.model.updateMany({
        surveyItem: surveyItem._id
      }, {
        $set: { question: clonedQuestion._id, syncDB: false }
      });

      surveyItem.type = 'question';
      surveyItem.question = clonedQuestion._id;

      await surveyItem.save();
    }
  } catch (e) {
    return Promise.reject(e);
  }
}

export default Trash;
