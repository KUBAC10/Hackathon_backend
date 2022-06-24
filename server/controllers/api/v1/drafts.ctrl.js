import _ from 'lodash';
import async from 'async';
import keystone from 'keystone';
import httpStatus from 'http-status';
import dot from 'dot-object';

// helpers
import {
  handleScopes,
  hasAccess,
  loadSurveyDoc
} from '../../helpers';
import getLocalizationFields from '../../../helpers/getLocalizationFields';
import { initSession } from '../../../helpers/transactions';
import {
  loadDraftSurvey,
  loadDraftSurveyItem,
  loadDraftSurveySection
} from '../../helpers/draftLoaders';
import { getCachedSurvey } from '../../helpers/loadSurveyAnswerData';

// models
import {
  Survey,
  SurveyItem,
  Question,
  QuestionItem,
  SurveySection,
  Company,
  ContentItem,
  ContentItemElement,
  Mailer,
  Trash,
  User,
  SurveyReportItem,
  PulseSurveyDriver,
  Consent,
  SurveyCampaign
} from '../../../models';
import setInDraftTrigger from '../../helpers/setInDraftTrigger';

// services
import { APIMessagesExtractor } from '../../../services';

// POST /api/v1/drafts
async function create(req, res, next) {
  const session = await initSession();
  try {
    const { defaultLanguage, surveyType, type = 'survey', name, customAnimation } = req.body;
    const { team, company } = req.scopes;
    const { isTemplateMaker } = req.user;

    if (surveyType === 'pulse' && !isTemplateMaker) {
      // clone primaryPulse survey
      const primaryPulse = await Survey.model.findOne({
        primaryPulse: true,
        inTrash: { $ne: true }
      });

      if (!primaryPulse) return res.sendStatus(httpStatus.BAD_REQUEST);

      let pulseSurveyId;

      await session.withTransaction(async () => {
        primaryPulse.customAnimation = customAnimation;

        pulseSurveyId = await primaryPulse.getClone({
          type: 'survey',
          user: req.user,
          session,
          customLanguage: defaultLanguage
        });
      });

      const reloadSurvey = await _reloadInitialSurvey(pulseSurveyId);

      return res.status(httpStatus.CREATED).send(reloadSurvey);
    }

    if (surveyType === 'pulse' && isTemplateMaker) {
      // check primary pulse survey existing
      const primaryPulse = await Survey.model.findOne({ primaryPulse: true });

      if (primaryPulse) return res.sendStatus(httpStatus.BAD_REQUEST);
    }

    const survey = new Survey.model({
      customAnimation,
      surveyType,
      company,
      team,
      type,
      defaultLanguage,
      translation: { [defaultLanguage]: true },
      name: { [defaultLanguage]: name || `New ${_.upperFirst(type)}` },
      allowReAnswer: surveyType === 'survey',
      displaySingleQuestion: !!customAnimation,
      publicAccess: true
    });
    const surveySection = new SurveySection.model({
      team,
      company,
      survey: survey._id,
      sortableId: 0
    });

    survey._withTheme = true;
    survey._req_user = req.user;

    await session.withTransaction(async () => {
      // create default pulse survey driver
      if (surveyType === 'pulse' && isTemplateMaker) {
        survey.primaryPulse = true;
        surveySection.primaryPulse = true;

        const pulseSurveyDriver = new PulseSurveyDriver.model({
          primaryPulse: true,
          company,
          team,
          survey
        });

        await pulseSurveyDriver.save({ session });

        surveySection.pulseSurveyDriver = pulseSurveyDriver._id;
      }

      await survey.save({ session });
      await surveySection.save({ session });
    });

    const reloadSurvey = await _reloadInitialSurvey(survey._id);

    return res.status(httpStatus.CREATED).send(reloadSurvey);
  } catch (e) {
    return next(e);
  }
}

// PUT /api/v1/drafts/:id - update survey draft
async function update(req, res, next) {
  const session = await initSession();
  try {
    const { id } = req.params;
    const data = req.body;
    const { isTemplateMaker } = req.user;
    const query = { _id: id, inTrash: { $ne: true } };

    const survey = await Survey.model.findOne(query);

    if (!survey) return res.sendStatus(httpStatus.NOT_FOUND);

    if (!hasAccess(survey, req.scopes)) return res.sendStatus(httpStatus.FORBIDDEN);

    if (!isTemplateMaker) {
      delete data.scope;
      delete data.publicPreview;
    }

    if (data.liveData !== undefined) {
      survey.liveData = data.liveData;

      delete data.liveData;
    }

    if (data.distributeByTargets !== undefined) {
      const query = {
        survey: survey._id,
        status: 'active',
        target: { $exists: !data.distributeByTargets }
      };

      const campaigns = await SurveyCampaign.model
        .find(query)
        .countDocuments();

      if (!campaigns) survey.distributeByTargets = data.distributeByTargets;

      delete data.distributeByTargets;
    }

    if (data.cookiesCheck !== undefined) {
      survey.cookiesCheck = data.cookiesCheck;

      delete data.cookiesCheck;
    }

    const draftCustomAnimation = _.get(survey, 'draftData.customAnimation');

    // disable update of single question setting if custom animation turn on
    if ((survey.customAnimation && draftCustomAnimation === undefined) || draftCustomAnimation) {
      delete data.displaySingleQuestion;
    }

    // turn on display single on custom animation
    if (data.customAnimation) data.displaySingleQuestion = true;

    const message = await _checkUrlName(survey, data.urlName);

    if (message) return res.status(httpStatus.BAD_REQUEST).send(message);

    survey.draftData = _.mergeWith(survey.draftData, data, (objValue, srcValue) => {
      if (_.isArray(srcValue)) return srcValue;
    });

    _markModified(survey, data);

    // set trigger value to survey config
    survey.inDraft = survey.isModified('draftData');

    await session.withTransaction(async () => await survey.save({ session }));

    const doc = await Survey.model
      .findOne({ _id: survey._id })
      .populate('surveyTheme')
      .lean();

    if (doc.surveyType === 'pulse') {
      doc.pulseSurveyDrivers = await PulseSurveyDriver.model
        .find({ survey: doc._id })
        .lean();
    }

    const draft = _.mergeWith(doc, doc.draftData, (objValue, srcValue) => {
      if (_.isArray(srcValue)) return srcValue;
    });

    return res.send(draft);
  } catch (e) {
    return next(e);
  }
}

// GET /api/v1/drafts/:id - get survey draft
async function show(req, res, next) {
  try {
    const { id } = req.params;
    const query = { _id: id, inTrash: { $ne: true } };

    const survey = await loadDraftSurvey(query);

    if (!survey) return res.sendStatus(httpStatus.NOT_FOUND);

    if (!hasAccess(survey, req.scopes)) return res.sendStatus(httpStatus.FORBIDDEN);

    return res.send(survey);
  } catch (e) {
    return next(e);
  }
}

// TODO refactor each entity-action to separated function
// POST /api/v1/drafts/:id - edit related to draft entities
async function edit(req, res, next) {
  const session = await initSession();
  try {
    const { id } = req.params;
    const { action, entity, entityId, data = {} } = req.body;
    const query = { _id: id, inTrash: { $ne: true } };

    const doc = await Survey.model
      .findOne(query)
      .select('company team defaultLanguage translation draftData.defaultLanguage draftData.translation surveyType inDraft');

    if (!doc) return res.sendStatus(httpStatus.NOT_FOUND);

    if (!hasAccess(doc, req.scopes)) return res.sendStatus(httpStatus.FORBIDDEN);

    const {
      _id: survey,
      team,
      company,
      defaultLanguage,
      translation,
      surveyType
    } = _.merge(doc, doc.draftData);

    // set team to req.user
    req.user.currentTeam = team;

    // set trigger value to survey config
    await setInDraftTrigger(survey, session);

    const Model = keystone.lists[_.upperFirst(entity)].model;

    const openTextCompanyQuery = {
      _id: company,
      'openTextConfig.active': { $eq: true },
      'openTextConfig.requiredNotifications': { $eq: true }
    };
    // create survey item with question or trendQuestion
    if (action === 'create' && entity === 'surveyItem') {
      console.log("PeroPut")
      const { Question } = keystone.lists;
      const questionTypes = ['countryList', 'text', 'multipleChoice', 'checkboxes', 'dropdown', 'linearScale', 'thumbs', 'netPromoterScore', 'slider', 'multipleChoiceMatrix', 'checkboxMatrix', 'imageTriangle', 'imageChoice'];
      const itemTypes = ['multipleChoice', 'checkboxes', 'dropdown'];
      const matrixTypes = ['multipleChoiceMatrix', 'checkboxMatrix'];

      let newQuestion;
      let newQuestionItems = [];
      let newGridRow;
      let newGridColumn;

      if (questionTypes.includes(data.question)) {
        const { QuestionItem, GridRow, GridColumn } = keystone.lists;
        const { question: type } = data;

        newQuestion = new Question.model({
          team,
          company,
          type,
          name: data.questionName,
          input: data.questionInput,
          inDraft: true,
          quiz: surveyType === 'quiz' && ['dropdown', 'checkboxes', 'multipleChoice', 'linearScale', 'thumbs', 'slider'].includes(type),
          draftData: {
            defaultLanguage,
            translation
          }
        });

        data.question = newQuestion._id;

        if (req.user.isTemplateMaker && doc.surveyType === 'pulse') {
          newQuestion.pulse = true;
          newQuestion.primaryPulse = true;
        }

        if (data.questionInput === 'number') newQuestion.linearScale = { from: null, to: null };

        if (type === 'thumbs') {
          if (data.fromCaption) newQuestion.linearScale.fromCaption = data.fromCaption;
          if (data.toCaption) newQuestion.linearScale.toCaption = data.toCaption;
        }

        if (type === 'linearScale') {
          if (data.quizCondition) newQuestion.quizCondition = data.quizCondition;
          if (_.isEmpty(data.quizCorrectValue)) {
            newQuestion.quizCorrectValue = data.quizCorrectValue;
          }

          if (data.quizCorrectRange) newQuestion.quizCorrectRange = data.quizCorrectRange;

          if (data.linearScale) newQuestion.linearScale = data.linearScale;
        }

        if (type === 'slider') {
          if (data.quizCondition) newQuestion.quizCondition = data.quizCondition;
          if (_.isEmpty(data.quizCorrectValue)) {
            newQuestion.quizCorrectValue = data.quizCorrectValue;
          }

          if (data.quizCorrectRange) newQuestion.quizCorrectRange = data.quizCorrectRange;

          newQuestion.linearScale.from = 0;
          newQuestion.linearScale.to = 100;
        }

        // apply default mailer if company open text notification is required
        if (newQuestion.type === 'text' && !data.questionInput) {
          const CompanyWithNotifications = await Company.model.findOne(openTextCompanyQuery);
          if (CompanyWithNotifications) {
            data.notificationMailer = await _applyDefaultMailer({
              company,
              user: req.user
            });
          }
        }

        if (newQuestion.type === 'imageTriangle') {
          // const item1 = new QuestionItem.model({
          //   company,
          //   team,
          //   name: data.questionItemName,
          //   question: newQuestion._id,
          //   sortableId: 0,
          //   inDraft: true,
          //   draftData: {
          //     defaultLanguage,
          //     translation
          //   }
          // });

          // newQuestionItems = [item1];
        }

        if (newQuestion.type === 'imageChoice') {
          const item1 = new QuestionItem.model({
            company,
            team,
            name: data.questionItemName,
            question: newQuestion._id,
            sortableId: 0,
            inDraft: true,
            draftData: {
              defaultLanguage,
              translation
            }
          });

          const item2 = new QuestionItem.model({
            company,
            team,
            name: data.secondQuestionItemName,
            question: newQuestion._id,
            sortableId: 1,
            inDraft: true,
            draftData: {
              defaultLanguage,
              translation
            }
          });

          newQuestionItems = [item1, item2];
        }

        if (itemTypes.includes(newQuestion.type)) {
          const item = new QuestionItem.model({
            company,
            team,
            name: data.questionItemName,
            question: newQuestion._id,
            inDraft: true,
            draftData: {
              defaultLanguage,
              translation
            }
          });

          newQuestionItems = [item];
        }

        if (matrixTypes.includes(newQuestion.type)) {
          newGridRow = new GridRow.model({
            company,
            team,
            name: data.gridRowName,
            question: newQuestion._id,
            inDraft: true,
            draftData: {
              defaultLanguage,
              translation
            }
          });
          newGridColumn = new GridColumn.model({
            company,
            team,
            name: data.gridColumnName,
            question: newQuestion._id,
            inDraft: true,
            draftData: {
              defaultLanguage,
              translation
            }
          });
        }
      }

      if (!newQuestion && data.type === 'question') {
        const generalQuestion = await Question.model
          .findOne({
            $or: [{ company }, { isGlobal: true }],
            _id: data.question,
            general: true,
          });

        if (!generalQuestion) return res.sendStatus(httpStatus.NOT_FOUND);

        const clonedQuestion = await generalQuestion
          .getClone({
            session,
            user: req.user,
            draftClone: true,
            translation: false, // skip translation hook to avoid existed translations overwriting
            assign: {
              draftData: { // add translation data to main object
                defaultLanguage,
                translation
              }
            },
          });

        data.question = clonedQuestion._id;

        // apply default mailer if company open text notification is required
        if (generalQuestion.type === 'text' && !generalQuestion.input) {
          const CompanyWithNotifications = await Company.model.findOne(openTextCompanyQuery);
          if (CompanyWithNotifications) {
            data.notificationMailer = await _applyDefaultMailer({
              company,
              user: req.user
            });
          }
        }
      }

      if (data.type === 'trendQuestion') {
        const trendQuestion = await Question.model
          .findOne({
            $or: [{ company }, { isGlobal: true }],
            _id: data.question,
            trend: true,
          });
        // apply default mailer if company open text notification is required
        if (trendQuestion.type === 'text' && !trendQuestion.input) {
          const CompanyWithNotifications = await Company.model.findOne(openTextCompanyQuery);
          if (CompanyWithNotifications) {
            data.notificationMailer = await _applyDefaultMailer({
              company,
              user: req.user
            });
          }
        }
      }
      
      const newSurveyItem = new Model({
        ...data,
        team,
        company,
        survey,
        inDraft: true
      });

      if (surveyType === 'pulse') {
        const surveySection = await SurveySection.model
          .findOne({ _id: data.surveySection })
          .select('pulseSurveyDriver')
          .lean();

        if (req.user.isTemplateMaker) {
          newSurveyItem.primaryPulse = true;
        }

        newSurveyItem.pulseSurveyDriver = surveySection.pulseSurveyDriver;
      }

      _handleItemIndexFlags(newSurveyItem, data.index);
      console.log('+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++0')
      await session.withTransaction(async () => {
        await newSurveyItem.save({ session });
        console.log('+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++1')
        if (newQuestion) await newQuestion.save({ session });
        console.log('+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++2')
        if (newQuestionItems && newQuestionItems.length) {
          for (const item of newQuestionItems) {
            await item.save({ session });
          }
        }
        console.log('+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++3')
        if (newGridRow && newGridColumn) {
          await newGridRow.save({ session });
          await newGridColumn.save({ session });
        }
      });
      console.log('+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++4')
      const reloadSurveyItem = await loadDraftSurveyItem({ _id: newSurveyItem._id });
      console.log('+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++5')
      return res.status(httpStatus.CREATED).send(reloadSurveyItem);
    }
    // create new survey item with contentItem if surveyItem is not present
    if (action === 'create' && entity === 'contentItem' && data.type === 'content' && !data.surveyItem) {
      const { surveySection } = data;

      // create new survey item
      const surveyItem = new SurveyItem.model({
        survey,
        team,
        company,
        surveySection,
        type: 'contents',
        inDraft: true
      });

      // create contentItem
      const contentItem = new Model({
        ...data,
        survey,
        team,
        company,
        surveyItem,
        inDraft: true,
        draftData: {
          defaultLanguage,
          translation
        }
      });

      _handleItemIndexFlags(surveyItem, data.index);

      await session.withTransaction(async () => {
        await surveyItem.save({ session });
        await contentItem.save({ session });
      });

      const reloadSurveyItem = await loadDraftSurveyItem({ _id: surveyItem._id });

      return res.status(httpStatus.CREATED).send(reloadSurveyItem);
    }
    // allows to set top or next to passed index position for new contentItem
    if (action === 'create' && entity === 'contentItem') {
      const doc = new Model({ ...data, team, company, survey, inDraft: true });

      doc.draftData = { defaultLanguage, translation };

      _handleItemIndexFlags(doc, data.index);

      //  set an order for a new start or end page item as a last item in the bottom
      //  or as a next to passed in the index param
      if (data.type === 'startPage' || data.type === 'endPage') {
        _handleItemIndexFlags(doc, data.index);
      }

      // allows to put a new contentItem to the top
      if (data.type === 'content' && data.index === -1) {
        _handleItemIndexFlags(doc, data.index);
      }

      await session.withTransaction(async () => await doc.save({ session }));

      const reloadDoc = await Model.findOne({ _id: doc._id }).lean();

      if (reloadDoc.type === 'endPage') {
        reloadDoc.flowItem = {};
        reloadDoc.contentItemElements = [];
      }

      return res.status(httpStatus.CREATED).send(_.merge(reloadDoc, reloadDoc.draftData));
    }
    // add flow logic to survey item
    if (action === 'create' && entity === 'flowLogic') {
      const { FlowItem } = keystone.lists;
      // create flow logic
      const doc = new Model({ ...data, team, company, inDraft: true });
      // create default flow item
      const flowItem = new FlowItem.model({
        team,
        company,
        survey,
        inDraft: true,
        questionType: data.questionType,
        flowLogic: doc._id,
      });

      flowItem._addDefaultItem = true;

      await session.withTransaction(async () => {
        await doc.save({ session });
        await flowItem.save({ session });
      });

      const reloadDoc = await Model
        .findOne({ _id: doc._id })
        .populate('flowItems')
        .lean();

      return res.status(httpStatus.CREATED).send(reloadDoc);
    }
    // remove survey section related flow logic soft delete survey items
    if (action === 'remove' && entity === 'surveySection') {
      const { SurveySection, SurveyItem, FlowLogic } = keystone.lists;
      const query = { _id: entityId, survey, draftRemove: { $ne: true } };

      // not template maker can't remove primary subdriver
      if (!req.user.isTemplateMaker && surveyType === 'pulse') {
        query.primaryPulse = { $ne: true };
      }

      // set user scope
      handleScopes({ reqScopes: req.scopes, query });
      // find survey section
      const surveySection = await SurveySection.model.findOne(query);

      if (!surveySection) return res.sendStatus(httpStatus.NOT_FOUND);

      // find related entities
      const [
        surveyItems,
        flowLogicEntities
      ] = await Promise.all([
        SurveyItem.model.find({
          inTrash: { $ne: true },
          draftRemove: { $ne: true },
          $or: [
            { 'draftData.surveySection': surveySection._id.toString() },
            {
              surveySection: surveySection._id,
              'draftData.surveySection': { $exists: false },
            },
          ]
        }),
        FlowLogic.model.find({
          $or: [
            { 'draftData.section': surveySection._id.toString() },
            {
              section: surveySection._id,
              'draftData.section': { $exists: false },
            }
          ]
        })
      ]);

      surveySection.draftRemove = true;

      // TODO rework
      await session.withTransaction(async () => {
        await surveySection.save({ session });
        // remove related to section survey items
        await async.eachLimit(surveyItems, 5, (item, cb) => {
          // handle surveyItem contentItems
          if (item.type === 'contents') {
            return ContentItem.model
              .find({
                inTrash: { $ne: true },
                draftRemove: { $ne: true },
                $or: [
                  { 'draftData.surveyItem': item._id },
                  {
                    surveyItem: item._id,
                    'draftData.surveyItem': { $exists: false },
                  },
                ]
              })
              .then((contentItems) => {
                // soft delete each content
                async.eachLimit(contentItems, 5, (content, callback) => {
                  content.softDelete({ session, stage: 'inDraft', draft: id })
                    .then(() => callback())
                    .catch(callback);
                }, (err) => {
                  if (err) return cb(err);
                  // set draftRemove to surveyItem
                  item.draftRemove = true;
                  item.save({ session })
                    .then(() => cb())
                    .catch(cb);
                });
              })
              .catch(cb);
          }

          item.softDelete({ session, stage: 'inDraft', draft: id })
            .then(() => cb())
            .catch(cb);
        });
        // draftRemove related flow logic
        await async.eachLimit(flowLogicEntities, 5, (flow, cb) => {
          flow.draftRemove = true;

          flow.save({ session })
            .then(() => cb())
            .catch(cb);
        });
      });

      const reloadSurvey = await loadDraftSurvey({ _id: doc._id });

      return res.send(reloadSurvey);
    }
    // handle survey item remove
    if (action === 'remove' && entity === 'surveyItem') {
      const query = {
        survey,
        _id: entityId,
        inTrash: { $ne: true },
        draftRemove: { $ne: true }
      };

      // not template maker can't remove primary survey Item
      if (!req.user.isTemplateMaker && surveyType === 'pulse') {
        query.primaryPulse = { $ne: true };
      }

      // apply user scopes
      handleScopes({ reqScopes: req.scopes, query });
      // find survey item
      const doc = await Model.findOne(query);

      if (!doc) return res.sendStatus(httpStatus.NOT_FOUND);
      // soft delete related content items
      if (doc.type === 'contents') {
        const contentItem = await ContentItem.model.findOne({
          team,
          company,
          inTrash: { $ne: true },
          draftRemove: { $ne: true },
          $or: [
            { 'draftData.surveyItem': doc._id },
            {
              surveyItem: doc._id,
              'draftData.surveyItem': { $exists: false },
            },
          ]
        });

        doc.draftRemove = true;

        await session.withTransaction(async () => await Promise.all([
          doc.save({ session }),
          contentItem.softDelete({
            session,
            stage: 'inDraft',
            draft: id
          })
        ]));
        // reload trash for content item
        const trash = await Trash.model
          .findOne({ contentItem: contentItem._id })
          .select('_id')
          .lean();

        return res.send(trash._id);
      }

      await session.withTransaction(async () => {
        await Promise.all([
          doc.softDelete({ session, stage: 'inDraft', draft: id }),
          SurveyReportItem.model.remove({ surveyItem: doc._id })
        ]);
      });

      // reload trash for survey
      const trash = await Trash.model
        .findOne({ surveyItem: doc._id })
        .select('_id')
        .lean();

      return res.send(trash._id);
    }
    // handle flow logic remove
    if (action === 'remove' && ['flowLogic', 'displayLogic', 'flowItem'].includes(entity)) {
      const query = { _id: entityId, draftRemove: { $ne: true } };

      handleScopes({ reqScopes: req.scopes, query });

      const item = await Model.findOne(query);

      if (!item) return res.sendStatus(httpStatus.NOT_FOUND);

      item.draftRemove = true;

      await session.withTransaction(async () => await item.save({ session }));

      return res.sendStatus(httpStatus.NO_CONTENT);
    }

    // content item element removing
    if (action === 'remove' && entity === 'contentItemElement') {
      const doc = await Model.findOne({ _id: entityId });

      if (!doc) return res.sendStatus(httpStatus.NOT_FOUND);

      doc.draftRemove = true;

      await session.withTransaction(async () => await doc.save({ session }));

      return res.sendStatus(httpStatus.OK);
    }

    // handle driver removing
    if (action === 'remove' && entity === 'pulseSurveyDriver') {
      const { PulseSurveyDriver, SurveySection, SurveyItem, FlowLogic } = keystone.lists;

      // pulse survey driver query
      const query = {
        _id: entityId,
        survey,
        draftRemove: { $ne: true }
      };

      // not template maker can't remove primary driver
      if (!req.user.isTemplateMaker && surveyType === 'pulse') {
        query.primaryPulse = { $ne: true };
      }

      // apply user scopes on query
      handleScopes({ reqScopes: req.scopes, query });

      // find driver to remove
      const driver = await PulseSurveyDriver.model.findOne(query);

      if (!driver) return res.sendStatus(httpStatus.NOT_FOUND);

      // load related survey sections
      const surveySections = await SurveySection.model
        .find({
          survey,
          pulseSurveyDriver: driver._id
        });

      const sectionIds = surveySections.map(section => section._id);

      // load related survey items and flow logic entities
      const [
        surveyItems,
        flowLogicEntities
      ] = await Promise.all([
        SurveyItem.model.find({
          survey,
          inTrash: { $ne: true },
          draftRemove: { $ne: true },
          primaryPulse: { $ne: doc.primaryPulse },
          $or: [
            { 'draftData.surveySection': { $in: sectionIds } },
            {
              surveySection: { $in: sectionIds },
              'draftData.surveySection': { $exists: false },
            },
          ]
        }),
        FlowLogic.model.find({
          $or: [
            { 'draftData.section': { $in: sectionIds } },
            {
              section: { $in: sectionIds },
              'draftData.section': { $exists: false },
            }
          ]
        })
      ]);

      await session.withTransaction(async () => {
        // set draft remove to driver
        driver.draftRemove = true;

        // remove driver
        await driver.save({ session });

        // draftRemove related sections
        await async.eachLimit(surveySections, 5, (section, cb) => {
          section.draftRemove = true;

          section.save({ session })
            .then(() => cb())
            .catch(cb);
        });

        // soft delete related survey items
        await async.eachLimit(surveyItems, 5, (item, cb) => {
          item.softDelete({ session, stage: 'inDraft', draft: id })
            .then(() => cb())
            .catch(cb);
        });

        // draftRemove related flow logic
        await async.eachLimit(flowLogicEntities, 5, (flow, cb) => {
          flow.draftRemove = true;

          flow.save({ session })
            .then(() => cb())
            .catch(cb);
        });
      });

      const reloadSurvey = await loadDraftSurvey({ _id: doc._id });

      return res.send(reloadSurvey);
    }

    //  TODO: move to model hooks
    if (['questionItem', 'gridColumn', 'gridRow'].includes(entity) && action === 'remove') {
      const { FlowLogic } = keystone.lists;
      const { surveyItemId } = req.body;
      const query = {
        _id: entityId,
        draftRemove: { $ne: true },
        inTrash: { $ne: true }
      };

      handleScopes({ reqScopes: req.scopes, query });

      const item = await Model.findOne(query);

      if (!item) return res.sendStatus(httpStatus.NOT_FOUND);

      const count = await Model
        .find({
          ...query,
          _id: { $ne: item._id },
          question: item.question
        })
        .countDocuments();

      if (!count) return res.sendStatus(httpStatus.BAD_REQUEST);

      const flowLogicEntities = await FlowLogic.model.find({
        surveyItem: surveyItemId
      });

      await session.withTransaction(async () => {
        await item.softDelete({
          session,
          stage: 'inDraft',
          draft: id
        });

        await async.eachLimit(flowLogicEntities, 5, (flow, cb) => {
          flow.draftRemove = true;

          flow.save({ session })
            .then(() => cb())
            .catch(cb);
        });
      });

      const reloadSurveyItem = await loadDraftSurveyItem({ _id: surveyItemId });

      return res.send(reloadSurveyItem);
    }

    if (action === 'create' && entity === 'questionItem' && _.isArray(data.name)) {
      const itemNames = data.name;

      const docs = [];

      // save item and collect array of question items
      for (const name of itemNames) {
        const doc = new Model({
          ...data,
          name: {
            [defaultLanguage]: name
          },
          team,
          company,
          inDraft: true,
          draftData: {
            defaultLanguage,
            translation
          }
        });

        doc._addDefaultItem = true;

        await session.withTransaction(async () => await doc.save({ session }));

        docs.push(doc._id);
      }

      // find all question items
      const reloadDocs = await Model.find({ _id: docs }).lean();

      const mergeDocs = reloadDocs.map(reloadDoc => _.merge(reloadDoc, reloadDoc.draftData));

      return res.status(httpStatus.CREATED).send(mergeDocs);
    }

    switch (action) {
      case 'create': {
        const doc = new Model({ ...data, team, company, survey, inDraft: true });

        doc.draftData = { defaultLanguage, translation };
        doc._addDefaultItem = true;

        await session.withTransaction(async () => await doc.save({ session }));

        const reloadDoc = await Model.findOne({ _id: doc._id }).lean();

        if (entity === 'contentItem' && reloadDoc.type === 'endPage') reloadDoc.flowItem = {};

        if (entity === 'displayLogic') reloadDoc.flowItems = [];

        if (entity === 'surveySection' && surveyType === 'pulse') {
          reloadDoc.pulseSurveyDriver = await PulseSurveyDriver.model
            .findOne({ _id: reloadDoc.pulseSurveyDriver })
            .lean();
        }

        return res.status(httpStatus.CREATED).send(_.merge(reloadDoc, reloadDoc.draftData));
      }
      case 'update': {
        const query = {
          _id: entityId,
          inTrash: { $ne: true },
          draftRemove: { $ne: true }
        };

        const cantChange = ['linearScale', 'thumbs', 'netPromoterScore', 'slider', 'countryList'];
        const entityTypes = ['pulseSurveyDriver', 'surveySection', 'surveyItem', 'question'];
        const pulseFields = [
          'active', 'hide', 'textComment', 'linearScale', 'defaultLanguage', 'translation',
          'name', 'passivesPlaceholder', 'detractorsPlaceholder', 'promotersPlaceholder',
          'detractorsComment', 'passivesComment', 'promotersComment', 'description'
        ];

        handleScopes({ reqScopes: req.scopes, query });

        const doc = await Model.findOne(query);

        if (!doc) return res.sendStatus(httpStatus.NOT_FOUND);

        // check if type cannot change
        if (
          entity === 'question' &&
          doc.type !== data.type &&
          cantChange.includes(data.type)
        ) {
          return res.sendStatus(httpStatus.BAD_REQUEST);
        }

        if (
          entity === 'question' &&
          data.type === 'text' &&
          _.isNull(data.input)
        ) {
          const company = await Company.model.findOne({ _id: doc.company });

          // check if text question disabled
          if (_.get(company, 'openTextConfig.disableTextQuestions')) {
            return res.status(httpStatus.BAD_REQUEST).send({
              message: await APIMessagesExtractor.getError(defaultLanguage, 'question.disabledQuestion')
            });
          }

          if (_.get(data, 'notificationMailer.active')) {
            const consent = await Consent.model
              .findOne({
                user: req.user,
                survey: doc.survey
              });

            // check if user not accept consent
            if (!consent) {
              return res.status(httpStatus.BAD_REQUEST).send({
                message: await APIMessagesExtractor.getError(defaultLanguage, 'question.acceptConsent')
              });
            }
          }
        }

        // apply default mailer and user email if some of field is not present
        if (_.get(data, 'notificationMailer.active')) {
          data.notificationMailer = await _applyDefaultMailer({ company, user: req.user });
        }

        // assign translation fields to handle draft translation
        let newData = { ...data, defaultLanguage, translation };

        // pick data for pulse
        if (entityTypes.includes(entity) && surveyType === 'pulse') {
          // crop from & to for linear Scale
          newData = _.omit(newData, ['linearScale.from', 'linearScale.to']);

          // pick fields for pulse
          newData = _.pick(newData, pulseFields);

          // pick fields if user try change primary entity
          if (!req.user.isTemplateMaker && doc.primaryPulse) {
            newData = _.pick(newData, ['active', 'hide', 'defaultLanguage', 'translation']);
          }
        }

        doc.draftData = _.mergeWith(doc.draftData, newData, (objValue, srcValue) => {
          if (_.isArray(srcValue)) return srcValue;
        });
        doc._moveItem = data.index !== undefined;

        _markModified(doc, newData);

        await session.withTransaction(async () => await doc.save({ session }));

        const reloadDoc = await Model.findOne({ _id: doc._id }).lean();

        if (
          entity === 'question' &&
          doc.type !== data.type &&
          doc.type === 'thumbs'
        ) {
          reloadDoc.questionItems = await QuestionItem.model
            .find({ question: doc._id })
            .sort('sortableId')
            .lean();
        }

        _.mergeWith(reloadDoc, reloadDoc.draftData, (objValue, srcValue) => {
          if (_.isArray(srcValue)) return srcValue;
        });

        if (entity === 'surveySection' && surveyType === 'pulse') {
          reloadDoc.pulseSurveyDriver = await PulseSurveyDriver.model
            .findOne({ _id: reloadDoc.pulseSurveyDriver })
            .lean();
        }

        if (entity === 'contentItem') {
          const contentItemElements = await ContentItemElement.model
            .find({
              contentItem: reloadDoc._id,
              draftRemove: { $ne: true }
            })
            .lean();

          reloadDoc.contentItemElements = contentItemElements
            .map(element => ({ ...element, ...element.draftData || {} }));
        }

        return res.send(reloadDoc);
      }
      case 'remove': {
        const query = {
          _id: entityId,
          inTrash: { $ne: true },
          draftRemove: { $ne: true }
        };

        handleScopes({ reqScopes: req.scopes, query });

        const doc = await Model.findOne(query);

        if (!doc) return res.sendStatus(httpStatus.NOT_FOUND);

        // assign default field for saved in trash
        if (['startPage', 'endPage'].includes(doc.type) && entity === 'contentItem') {
          _.set(doc, 'draftData.default', false);

          doc.markModified('draftData.default');
        }

        await session.withTransaction(async () => await doc.softDelete({
          session,
          stage: 'inDraft',
          draft: id
        }));

        if (entity === 'contentItem') {
          const trash = await Trash.model
            .findOne({ contentItem: doc._id })
            .select('_id')
            .lean();

          return res.send(trash._id);
        }

        return res.sendStatus(httpStatus.NO_CONTENT);
      }
      default:
        return res.sendStatus(httpStatus.UNPROCESSABLE_ENTITY);
    }
  } catch (e) {
    return next(e);
  }
}

// POST /api/v1/drafts/convert-question - convert trend question to regular
async function convertQuestion(req, res, next) {
  const session = await initSession();
  try {
    const { surveyItemId } = req.body;
    const query = {
      _id: surveyItemId,
      type: 'trendQuestion',
      draftRemove: { $ne: true },
      inTrash: { $ne: true }
    };

    const surveyItem = await SurveyItem.model
      .findOne(query)
      .populate({
        path: 'survey',
        select: 'defaultLanguage translation draftData'
      });

    if (!surveyItem) return res.sendStatus(httpStatus.NOT_FOUND);

    if (!hasAccess(surveyItem, req.scopes)) return res.sendStatus(httpStatus.FORBIDDEN);

    const trendQuestion = await Question.model.findOne({
      _id: surveyItem.question,
      trend: true
    });

    if (!trendQuestion) return res.sendStatus(httpStatus.NOT_FOUND);

    const {
      defaultLanguage,
      translation
    } = _.merge(surveyItem.survey, surveyItem.survey.draftData);

    await session.withTransaction(async () => {
      surveyItem.type = 'question';
      const clonedQuestion = await trendQuestion.getClone({
        session,
        user: req.user,
        replaceTrend: true,
        draftClone: true,
        translation: true, // dont skip translation hook
        assign: {
          draftData: { // add translation data to main object
            defaultLanguage,
            translation
          }
        },
        assignItem: {
          draftData: { // add translation data to each item if present
            defaultLanguage,
            translation
          }
        }
      });

      surveyItem.question = clonedQuestion._id;

      await surveyItem.save({ session });
    });

    const reloadSurveyItem = await loadDraftSurveyItem({ _id: surveyItem._id });

    return res.send(reloadSurveyItem);
  } catch (e) {
    return next(e);
  }
}

// POST /api/v1/drafts/clone-survey-section - clone survey section
async function cloneSurveySection(req, res, next) {
  const session = await initSession();
  try {
    const { surveySectionId, index } = req.body;
    const query = { _id: surveySectionId, draftRemove: { $ne: true } };

    const surveySection = await SurveySection.model.findOne(query).lean();

    if (!surveySection) return res.sendStatus(httpStatus.NOT_FOUND);

    if (!hasAccess(surveySection, req.scopes)) return res.sendStatus(httpStatus.FORBIDDEN);

    const surveyItems = await SurveyItem.model.find({
      survey: surveySection.survey,
      surveySection: surveySection._id,
      draftRemove: { $ne: true },
      inTrash: { $ne: true }
    });

    const clone = new SurveySection.model({
      ..._.omit(surveySection, ['_id', 'step', 'draftData']),
      draftData: { ...surveySection.draftData, index },
      inDraft: true
    });

    clone._addAfterDefined = true;

    await session.withTransaction(async () => {
      await clone.save({ session });

      await async.eachLimit(surveyItems, 5, (surveyItem, cb) => {
        surveyItem.surveySection = clone._id;
        surveyItem._skipHandleSortableId = true;
        surveyItem.getClone({ session, user: req.user, draftClone: true, cloneSection: true })
          .then(() => cb())
          .catch(cb);
      });
    });

    const reloadSection = await loadDraftSurveySection(clone._id);

    return res.send(reloadSection);
  } catch (e) {
    return next(e);
  }
}

// POST /api/v1/drafts/clone-survey-item - clone survey item
async function cloneSurveyItem(req, res, next) {
  const session = await initSession();
  try {
    const { SurveyItem } = keystone.lists;
    const { surveyItemId } = req.body;
    const query = { _id: surveyItemId, draftRemove: { $ne: true }, inTrash: { $ne: true } };

    const surveyItem = await SurveyItem.model.findOne(query);

    if (!surveyItem) return res.sendStatus(httpStatus.NOT_FOUND);

    if (!hasAccess(surveyItem, req.scopes)) return res.sendStatus(httpStatus.FORBIDDEN);

    const sortableId = _getActualSortableId(surveyItem);

    // set value for further processing in model
    surveyItem.sortableId = sortableId;

    // set value for further processing in model
    surveyItem.sortableId = _getActualSortableId(surveyItem);

    //  set team from surveyItem tp user
    req.user.currentTeam = surveyItem.team;

    let cloneSurveyItemId;

    await session.withTransaction(async () => {
      [cloneSurveyItemId] = await Promise.all([
        surveyItem
          .getClone({ session, user: req.user, draftClone: true }),
        setInDraftTrigger(surveyItem.survey, session)
      ]);
    });

    // reload survey item with created question/items/rows/columns
    const reloadSurveyItem = await loadDraftSurveyItem({ _id: cloneSurveyItemId._id });

    return res.status(httpStatus.CREATED).send(reloadSurveyItem);
  } catch (e) {
    return next(e);
  }
}

// POST /api/v1/drafts/clone-content-item - clone content items
async function cloneContentItem(req, res, next) {
  const session = await initSession();
  try {
    const { ContentItem } = keystone.lists;
    const { contentItemId } = req.body;
    const query = { _id: contentItemId, draftRemove: { $ne: true } };

    const contentItem = await ContentItem.model.findOne(query);

    if (!contentItem) return res.sendStatus(httpStatus.NOT_FOUND);

    if (!hasAccess(contentItem, req.scopes)) return res.sendStatus(httpStatus.FORBIDDEN);

    //  set team from surveyItem tp user
    req.user.currentTeam = contentItem.team;

    let cloneContentItemId;

    await session.withTransaction(async () => {
      [cloneContentItemId] = await Promise.all([
        contentItem
          .getClone({ session, user: req.user, draftClone: true }),
        setInDraftTrigger(contentItem.survey, session)
      ]);
    });

    const reloadContent = await ContentItem.model
      .findOne({ _id: cloneContentItemId })
      .lean();

    return res.status(httpStatus.CREATED).send(_.merge(reloadContent, reloadContent.draftData));
  } catch (e) {
    return next(e);
  }
}

// POST /api/v1/drafts/clone-driver - clone pulse survey driver
async function cloneDriver(req, res, next) {
  const session = await initSession();

  try {
    const { driverId } = req.body;

    const query = {
      _id: driverId,
      draftRemove: { $ne: true },
      primaryPulse: { $ne: true }
    };

    const pulseSurveyDriver = await PulseSurveyDriver.model.findOne(query);

    if (!pulseSurveyDriver) return res.sendStatus(httpStatus.NOT_FOUND);

    if (!hasAccess(pulseSurveyDriver, req.scopes)) return res.sendStatus(httpStatus.FORBIDDEN);

    // handle sortable id on driver duplicate
    pulseSurveyDriver._driverDuplicate = true;

    await session.withTransaction(async () => {
      await pulseSurveyDriver.duplicate({ session, user: req.user });
    });

    const reloadSurvey = await loadDraftSurvey({ _id: pulseSurveyDriver.survey });

    return res.send(reloadSurvey);
  } catch (e) {
    return next(e);
  }
}

// POST /api/v1/drafts/move-survey-item - move survey item to another section
async function moveSurveyItem(req, res, next) {
  const session = await initSession();

  try {
    const { surveyItem, surveySection } = req.body;
    const { SurveyItem, SurveySection } = keystone.lists;

    const query = { _id: surveySection, draftRemove: { $ne: true } };

    const section = await SurveySection.model
      .findOne(query)
      .lean();

    if (!section) return res.sendStatus(httpStatus.NOT_FOUND);

    if (!hasAccess(section, req.scopes)) return res.sendStatus(httpStatus.FORBIDDEN);

    query._id = surveyItem;

    const item = await SurveyItem.model.findOne(query);

    if (!item) return res.sendStatus(httpStatus.NOT_FOUND);

    if (!hasAccess(item, req.scopes)) return res.sendStatus(httpStatus.FORBIDDEN);

    // set new surveySection
    _.set(item, 'draftData.surveySection', section._id);

    item._addDefaultItem = true;
    item.markModified('draftData.surveySection');

    await session.withTransaction(async () => {
      await Promise.all([
        item.save({ session }),
        setInDraftTrigger(section.survey, session)
      ]);
    });

    const survey = await loadDraftSurvey({ ...query, _id: section.survey });

    return res.send(survey);
  } catch (e) {
    return next(e);
  }
}

// POST /api/v1/drafts/divide/:id - move existing survey item content to new survey item
async function divide(req, res, next) {
  const session = await initSession();
  try {
    const { id } = req.params;
    const { index, surveySection, contentId } = req.body;
    const query = { _id: id, inTrash: { $ne: true } };

    const survey = await Survey.model
      .findOne(query)
      .select('company team')
      .lean();

    if (!survey) return res.sendStatus(httpStatus.NOT_FOUND);

    if (!hasAccess(survey, req.scopes)) return res.sendStatus(httpStatus.FORBIDDEN);

    const { company, team } = survey;

    const content = await ContentItem.model.findOne({
      _id: contentId,
      draftRemove: { $ne: true }
    });

    if (!content) return res.sendStatus(httpStatus.NOT_FOUND);

    if (!hasAccess(content, req.scopes)) return res.sendStatus(httpStatus.FORBIDDEN);

    // create new survey item
    const surveyItem = new SurveyItem.model({
      company,
      team,
      surveySection,
      survey,
      inDraft: true,
      type: 'contents'
    });

    _.set(content, 'draftData.surveyItem', surveyItem._id);

    surveyItem._addAfterDefined = true;
    surveyItem.draftData = { index };

    content.markModified('draftData.surveyItem');

    await session.withTransaction(async () => await Promise.all([
      surveyItem.save({ session }),
      content.save({ session }),
    ]));

    const reloadSurveyItem = await loadDraftSurveyItem({ _id: surveyItem._id });

    return res.status(httpStatus.CREATED).send(reloadSurveyItem);
  } catch (e) {
    return next(e);
  }
}

// POST /api/v1/drafts/switch-page/:id - switch default start/end page
async function switchPage(req, res, next) {
  const session = await initSession();

  try {
    const { id } = req.params;
    const { entityId, type } = req.body;
    const query = { _id: id, inTrash: { $ne: true } };

    const survey = await loadDraftSurvey(query);

    if (!survey) return res.sendStatus(httpStatus.NOT_FOUND);

    if (!hasAccess(survey, req.scopes)) return res.sendStatus(httpStatus.FORBIDDEN);

    const pagesQuery = {
      type,
      survey: survey._id,
      draftRemove: { $ne: true },
      inTrash: { $ne: true }
    };

    const pages = await ContentItem.model
      .find(pagesQuery)
      .sort('sortableId');

    await session.withTransaction(async () => {
      for (const page of pages) {
        _.set(page, 'draftData.default', page._id.toString() === entityId.toString());

        page.markModified('draftData.default');

        await page.save({ session });
      }
    });

    const reloadPages = await ContentItem.model
      .find(pagesQuery)
      .populate('flowItem')
      .sort('sortableId')
      .lean();

    // merge draft data
    const data = reloadPages.map(endPage => ({
      ..._.merge(endPage, endPage.draftData),
      flowItem: _.get(endPage, 'flowItem._id')
    }));

    return res.send(data);
  } catch (e) {
    return next(e);
  }
}

// POST /api/v1/drafts/apply/:id - apply draft survey
async function apply(req, res, next) {
  const session = await initSession();
  try {
    const { id } = req.params;
    const query = { _id: id, inTrash: { $ne: true } };

    const survey = await Survey.model.findOne(query);

    if (!survey) return res.sendStatus(httpStatus.NOT_FOUND);

    if (!hasAccess(survey, req.scopes)) return res.sendStatus(httpStatus.FORBIDDEN);

    const draft = await loadDraftSurvey(query);

    // check fields translation before apply
    const untranslatedFields = _checkDraftTranslation(draft);

    if (draft.scoring) {
      survey.overallScore = _countOverallScorePoints(draft);
    }

    // return array of field to translate
    if (untranslatedFields.length) {
      return res.status(httpStatus.BAD_REQUEST).send({
        untranslatedFields,
        message: 'Please complete translation before publishing'
      });
    }

    await session.withTransaction(async () => await survey.applyDraft({ session }));

    const reloadSurvey = await loadSurveyDoc({ _id: survey._id });

    // cache survey
    await getCachedSurvey({ ...reloadSurvey }, true);

    return res.send(reloadSurvey);
  } catch (e) {
    return next(e);
  }
}

// POST /api/v1/drafts/remove/:id - revert draft data
async function remove(req, res, next) {
  const session = await initSession();
  try {
    const { id } = req.params;
    const query = { _id: id, inTrash: { $ne: true } };

    const survey = await Survey.model.findOne(query);

    if (!survey) return res.sendStatus(httpStatus.NOT_FOUND);

    if (!hasAccess(survey, req.scopes)) return res.sendStatus(httpStatus.FORBIDDEN);

    await session.withTransaction(async () => await survey.closeDraft({ session }));

    const reloadSurvey = await loadSurveyDoc({ _id: survey._id });

    return res.send(reloadSurvey);
  } catch (e) {
    return next(e);
  }
}

// GET /api/v1/drafts/check-translation/:id - count fields to translate
async function checkTranslation(req, res, next) {
  try {
    const { id } = req.params;
    const query = { _id: id, inTrash: { $ne: true } };

    handleScopes({ reqScopes: req.scopes, query });

    const draft = await loadDraftSurvey(query);

    if (!draft) return res.sendStatus(httpStatus.NOT_FOUND);

    // check fields translation
    const untranslatedFields = _checkDraftTranslation(draft);

    return res.send({ counter: untranslatedFields.length });
  } catch (e) {
    return next(e);
  }
}

// GET /api/v1/drafts/count-score/:id - count maximum score
async function countScorePoints(req, res, next) {
  try {
    const { id } = req.params;
    const query = { _id: id, inTrash: { $ne: true } };

    handleScopes({ reqScopes: req.scopes, query });

    const draft = await loadDraftSurvey(query);

    if (!draft) return res.sendStatus(httpStatus.NOT_FOUND);

    const overallScore = _countOverallScorePoints(draft);

    return res.send({ overallScore });
  } catch (e) {
    return next(e);
  }
}

function _countOverallScorePoints(survey) {
  // question types with score
  const questionTypes = ['imageChoice', 'dropdown', 'checkboxes', 'multipleChoice', 'linearScale', 'thumbs'];

  return survey.surveySections
    .reduce((acc, section) => [
      ...acc,
      ...section.surveyItems
    ], [])
    .filter(item => ['question', 'trendQuestion'].includes(item.type) && item.question)
    .filter(item => questionTypes.includes(item.question.type))
    .reduce((acc, surveyItem) => {
      const questionType = surveyItem.question.type;

      if (['imageChoice', 'dropdown', 'checkboxes', 'multipleChoice'].includes(questionType)) {
        let questionItems = _.get(surveyItem, 'question.questionItems', []);

        if (typeof surveyItem.maxAnswers === 'number' || ['dropdown', 'multipleChoice'].includes(questionType)) {
          questionItems = questionItems
            .sort((a, b) => parseInt(b.score || 0, 10) - parseInt(a.score || 0, 10))
            .slice(0, surveyItem.maxAnswers || 1);
        }

        questionItems.forEach((item) => {
          acc += parseInt(item.score || 0, 10);
        });
      }

      if (['linearScale', 'thumbs'].includes(questionType)) {
        const scoreObj = _.get(surveyItem, 'question.scoreObj', {});

        const [max] = Object.values(scoreObj).sort((a, b) => b - a);

        acc += parseInt(max || 0, 10);
      }

      return acc;
    }, 0);
}

async function _checkUrlName(survey, urlName) {
  try {
    if (!urlName) return;

    const { _id, company } = survey;

    const count = await Survey.model
      .find({ _id: { $ne: _id }, company, $or: [{ urlName }, { 'draftData.urlName': urlName }] })
      .countDocuments();

    if (count) return { urlName: 'Had been already taken' };
  } catch (e) {
    return Promise.reject(e);
  }
}

// returns data about fields in need of translation
function _checkDraftTranslation(survey) {
  const untranslatedFields = [];

  const surveyFields = getLocalizationFields('Survey');
  const surveySectionFields = getLocalizationFields('SurveySection');
  const questionFields = getLocalizationFields('Question');
  const questionItemFields = getLocalizationFields('QuestionItem');
  const gridRowFields = getLocalizationFields('GridRow');
  const gridColumnFields = getLocalizationFields('GridColumn');
  const contentItemFields = getLocalizationFields('ContentItem');
  const contentItemElementFields = getLocalizationFields('ContentItemElement');

  surveyFields
    .filter(field => _.get(survey, `${field}Changed`, false))
    .forEach(field => untranslatedFields.push({ entity: 'survey', entityId: survey._id, field }));

  survey.surveySections.forEach((section) => {
    surveySectionFields
      .filter(field => _.get(section, `${field}Changed`, false))
      .forEach(field => untranslatedFields.push({
        entity: 'surveySection',
        entityId: section._id,
        field
      }));

    section.surveyItems.forEach((surveyItem) => {
      const { question, type, contents = [] } = surveyItem;

      if (type === 'contents') {
        contents.forEach((contentItem) => {
          contentItemFields
            .filter(field => _.get(contentItem, `${field}Changed`, false))
            .forEach(field => untranslatedFields.push({
              field,
              entity: 'contentItem',
              entityType: 'contents',
              fieldType: field === 'html' ? 'html' : 'string',
              entityId: contentItem._id
            }));
        });
      }

      if (question && type === 'question') {
        questionFields
          .filter(field => _.get(question, `${field}Changed`, false))
          .forEach(field => untranslatedFields.push({
            entity: 'question',
            entityId: question._id,
            field
          }));

        const { questionItems, gridRows, gridColumns } = question;

        questionItems.forEach((questionItem) => {
          questionItemFields
            .filter(field => _.get(questionItem, `${field}Changed`, false))
            .forEach(field => untranslatedFields.push({
              entity: 'questionItem',
              entityId: questionItem._id,
              field
            }));
        });

        gridRows.forEach((gridRow) => {
          gridRowFields
            .filter(field => _.get(gridRow, `${field}Changed`, false))
            .forEach(field => untranslatedFields.push({
              entity: 'gridRow',
              entityId: gridRow._id,
              field
            }));
        });

        gridColumns.forEach((gridColumn) => {
          gridColumnFields
            .filter(field => _.get(gridColumn, `${field}Changed`, false))
            .forEach(field => untranslatedFields.push({
              entity: 'gridColumn',
              entityId: gridColumn._id,
              field
            }));
        });
      }
    });
  });

  survey.startPages.forEach((startPage) => {
    contentItemFields
      .filter(field => _.get(startPage, `${field}Changed`, false))
      .forEach(field => untranslatedFields.push({
        field,
        entity: 'contentItem',
        entityType: 'startPages',
        fieldType: field === 'html' ? 'html' : 'string',
        entityId: startPage._id
      }));
  });

  survey.endPages.forEach((endPage) => {
    contentItemFields
      .filter(field => _.get(endPage, `${field}Changed`, false))
      .forEach(field => untranslatedFields.push({
        field,
        entity: 'contentItem',
        entityType: 'endPages',
        fieldType: field === 'html' ? 'html' : 'string',
        entityId: endPage._id
      }));

    endPage.contentItemElements.forEach((contentItemElement) => {
      contentItemElementFields
        .filter(field => _.get(contentItemElement, `${field}Changed`, false))
        .forEach(field => untranslatedFields.push({
          entity: 'contentItemElement',
          entityId: contentItemElement._id,
          contentItem: contentItemElement.contentItem,
          field
        }));
    });
  });

  return untranslatedFields;
}

function _markModified(doc, data) {
  Object
    .keys(dot.dot(data))
    .forEach((key) => {
      if (key.includes('notificationMailer.emails')) {
        return doc.markModified('draftData.notificationMailer.emails');
      }

      if (key.includes('questionItems')) {
        return doc.markModified('draftData.questionItems');
      }

      if (key.includes('scope.companies')) {
        return doc.markModified('draftData.scope.companies');
      }

      if (key.includes('externalLinks')) {
        return doc.markModified('draftData.externalLinks');
      }

      doc.markModified(`draftData.${key}`);
    });
}

//  get sortableId from draftData if it exists, otherwise get regular sortableId
function _getActualSortableId(surveyItem) {
  if (_.get(surveyItem, ['draftData', 'sortableId'])) {
    return _.get(surveyItem, 'draftData.sortableId');
  }
  return _.get(surveyItem, 'sortableId');
}

//  figure out which trigger should be set [_addAfterDefined,_moveItem,_addDefaultItem]
function _handleItemIndexFlags(item, index) {
  _.set(item, 'draftData.index', index);
  //  put item after passed index value
  if (_.isNumber(index) && index !== -1) {
    item._addAfterDefined = true;
    return;
  }
  // move to top exception
  if (index === -1) {
    item._moveItem = true;
    return;
  }
  //  if no index param were passed
  item._addDefaultItem = true;
}

async function _applyDefaultMailer({ company, user }) {
  const userDoc = await User.model.findById(user._id);
  const questionNotificationMailer = await Mailer.model.findOne({
    fromGlobal: true,
    type: 'questionNotification',
    company
  });

  return {
    active: true,
    emails: [userDoc.email],
    mailer: questionNotificationMailer._id.toString(),
  };
}

async function _reloadInitialSurvey(surveyId) {
  try {
    return await Survey.model
      .findOne({ _id: surveyId })
      .populate({
        path: 'surveySections',
        populate: 'pulseSurveyDriver'
      })
      .lean();
  } catch (e) {
    return Promise.reject(e);
  }
}

export default {
  create,
  update,
  show,
  edit,
  convertQuestion,
  cloneSurveySection,
  cloneSurveyItem,
  cloneContentItem,
  cloneDriver,
  moveSurveyItem,
  divide,
  switchPage,
  apply,
  remove,
  checkTranslation,
  countScorePoints
};
