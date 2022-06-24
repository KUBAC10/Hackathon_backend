import _ from 'lodash';
import async from 'async';
import keystone from 'keystone';

// models
import {
  ContentItem,
  ContentItemElement,
  FlowItem,
  FlowLogic,
  Question,
  Survey,
  SurveyItem,
  SurveySection,
  SurveyTheme,
  PulseSurveyDriver
} from '../../models';

// services
import cloudinaryUploader from '../../services/CloudinaryUploader';

//  TODO clone cloudinary images
// create survey from exported to file survey data
export default async function createSurveyFromData({ data, session, user }) {
  try {
    const { currentTeam: team, companyId: company } = user;
    const ids = {}; // { [original._id]: clone._id }

    // init accumulators
    const surveyItemsData = [];
    const questionsData = [];
    const questionItemsData = [];
    const contentItemsData = [];
    const flowLogicData = [];
    const displayLogicData = [];
    const flowItemsData = [];
    const contentItemElementsData = [];

    // get survey data
    const {
      startPages = [],
      endPages = [],
      surveySections = [],
      pulseSurveyDrivers = [],
      surveyTheme,
      ...surveyData
    } = data;

    // push content items
    contentItemsData.push(...startPages, ...endPages);

    // get fill content item elements
    contentItemsData
      .filter(i => i.contentItemElements && i.contentItemElements.length)
      .forEach(({ contentItemElements = [] }) => {
        contentItemElementsData.push(...contentItemElements);
      });

    // create survey
    const surveyDoc = new Survey.model({
      ..._.omit(surveyData, '_id'),
      team,
      company
    });

    // set creator
    surveyDoc.createdBy = { _id: user._id };
    surveyDoc.updatedBy = { _id: user._id };
    surveyDoc._req_user = { _id: user._id };

    // TODO temporary add update preview flag
    surveyDoc.updatePreviewScreenShot = true;

    // clone preview screenshot
    await _cloneImage(surveyDoc, 'previewScreenShot', 'surveyPreview');

    // save survey
    const { _id: surveyDocId } = await surveyDoc.save({ session });

    // set surveyId
    ids[data._id] = surveyDocId;

    // create pulse driver
    await async.eachLimit(pulseSurveyDrivers, 5, (driver, cb) => {
      const driverDoc = new PulseSurveyDriver.model({
        ..._.omit(driver, ['_id']),
        company,
        team,
        survey: ids[data._id]
      });

      driverDoc
        .save({ session })
        .then(({ _id }) => {
          ids[driver._id] = _id;

          cb();
        })
        .catch(cb);
    });

    // create survey sections
    await async.eachLimit(surveySections, 5, (section, cb) => {
      const { surveyItems = [], pulseSurveyDriver, ...surveySectionData } = section;

      surveyItems.forEach((surveyItem) => {
        const {
          flowLogic = [],
          displayLogic = [],
          contents = [],
          ...surveyItemData
        } = surveyItem;

        if (pulseSurveyDriver) {
          surveyItemData.pulseSurveyDriver = ids[surveyItem.pulseSurveyDriver];
        }

        surveyItemsData.push(surveyItemData);
        flowLogicData.push(...flowLogic);
        displayLogicData.push(...displayLogic);
        contentItemsData.push(...contents);

        if (surveyItem.question) questionsData.push(surveyItem.question);
      });

      const sectionDoc = new SurveySection.model({
        ..._.omit(surveySectionData, ['_id']),
        company,
        team,
        survey: ids[data._id]
      });

      if (pulseSurveyDriver) {
        pulseSurveyDriver._id = ids[pulseSurveyDriver._id];
        pulseSurveyDriver.survey = ids[data._id];

        sectionDoc.pulseSurveyDriver = pulseSurveyDriver;
      }

      sectionDoc._req_user = user;
      sectionDoc
        .save({ session })
        .then(({ _id }) => {
          ids[section._id] = _id;

          cb();
        })
        .catch(cb);
    });

    // create questions
    await async.eachLimit(questionsData, 5, (question, cb) => {
      const {
        questionItems = [],
        gridRows = [],
        gridColumns = [],
        ...questionData
      } = question;

      // fill accumulators and apply collection name
      questionItemsData.push(
        ...questionItems.map(i => ({ ...i, collection: 'QuestionItem' })),
        ...gridRows.map(i => ({ ...i, collection: 'GridRow' })),
        ...gridColumns.map(i => ({ ...i, collection: 'GridColumn' }))
      );

      const questionDoc = new Question.model({
        ..._.omit(questionData, ['_id', 'trend', 'general']),
        company,
        team
      });

      questionDoc._req_user = user;
      questionDoc
        .save({ session })
        .then(({ _id }) => {
          ids[question._id] = _id;

          cb();
        })
        .catch(cb);
    });

    // create survey items
    await async.eachLimit(surveyItemsData, 5, (surveyItem, cb) => {
      const surveyItemDoc = new SurveyItem.model({
        ..._.omit(surveyItem, '_id'),
        survey: ids[surveyItem.survey],
        surveySection: ids[surveyItem.surveySection],
        company,
        team
      });

      if (surveyItem.question) surveyItemDoc.question = ids[surveyItem.question._id];
      if (surveyItemDoc.type !== 'contents') surveyItemDoc.type = 'question';

      surveyItemDoc._req_user = user;
      surveyItemDoc
        .save({ session })
        .then(({ _id }) => {
          ids[surveyItem._id] = _id;

          cb();
        })
        .catch(cb);
    });

    // create grid rows grid columns and question items
    await async.eachLimit(questionItemsData, 5, (item, cb) => {
      const { collection, ...itemData } = item;

      const itemDoc = new keystone.lists[collection].model({
        ..._.omit(itemData, ['_id']),
        question: ids[itemData.question],
        company,
        team,
      });

      itemDoc._uploadSurvey = true; // clone image

      itemDoc
        .save({ session })
        .then(({ _id }) => {
          ids[item._id] = _id;

          cb();
        })
        .catch(cb);
    });

    // create content items
    await async.eachLimit(contentItemsData, 5, (contentItem, cb) => {
      const { flowItem, ...contentData } = contentItem;

      if (flowItem && !_.isEmpty(flowItem)) flowItemsData.push(flowItem);

      const contentDoc = new ContentItem.model({
        ..._.omit(contentData, ['_id']),
        survey: ids[contentData.survey],
        surveyItem: ids[contentData.surveyItem],
        company,
        team
      });

      contentDoc._req_user = user;
      contentDoc._uploadSurvey = true; // clone images
      contentDoc
        .save({ session })
        .then(({ _id }) => {
          ids[contentItem._id] = _id;

          cb();
        })
        .catch(cb);
    });

    // create flow logic
    await async.eachLimit(flowLogicData, 5, (flowLogic, cb) => {
      const { flowItems = [], ...flowLogicData } = flowLogic;

      flowItemsData.push(...flowItems);

      const flowItemDoc = new FlowLogic.model({
        ..._.omit(flowLogicData, ['_id']),
        survey: ids[flowLogicData.survey],
        section: ids[flowLogicData.section],
        surveyItem: ids[flowLogicData.surveyItem],
        endPage: ids[flowLogicData.endPage],
        company,
        team
      });

      flowItemDoc._req_user = user;
      flowItemDoc
        .save({ session })
        .then(({ _id }) => {
          ids[flowLogic._id] = _id;

          cb();
        })
        .catch(cb);
    });

    // create display logic
    await async.eachLimit(displayLogicData, 5, (displayLogic, cb) => {
      const { flowItems = [], ...displayLogicData } = displayLogic;

      flowItemsData.push(...flowItems);

      const flowItemDoc = new FlowLogic.model({
        ..._.omit(displayLogicData, ['_id']),
        survey: ids[displayLogicData.survey],
        surveyItem: ids[displayLogicData.surveyItem],
        conditionSurveyItem: ids[displayLogicData.conditionSurveyItem],
        company,
        team
      });

      flowItemDoc._req_user = user;
      flowItemDoc
        .save({ session })
        .then(({ _id }) => {
          ids[displayLogic._id] = _id;

          cb();
        })
        .catch(cb);
    });

    // create flow items
    await async.eachLimit(flowItemsData, 5, (flowItem, cb) => {
      const flowItemDoc = new FlowItem.model({
        ..._.omit(flowItem, ['_id']),
        survey: ids[flowItem.survey],
        gridRow: ids[flowItem.gridRow],
        gridColumn: ids[flowItem.gridColumn],
        flowLogic: ids[flowItem.flowLogic],
        displayLogic: ids[flowItem.displayLogic],
        endPage: ids[flowItem.endPage],
        questionItems: flowItem.questionItems.map(i => ids[i]),
        company,
        team
      });

      flowItemDoc._req_user = user;
      flowItemDoc
        .save({ session })
        .then(() => cb())
        .catch(cb);
    });

    // create content item elements
    await async.eachLimit(contentItemElementsData, 5, (element, cb) => {
      const contentDoc = new ContentItemElement.model({
        ..._.omit(element, ['_id']),
        contentItem: ids[element.contentItem],
        company,
        team
      });

      contentDoc._req_user = user;
      contentDoc
        .save({ session })
        .then(() => cb())
        .catch(cb);
    });

    // create survey theme
    if (surveyTheme) {
      const surveyThemeDoc = new SurveyTheme.model({
        ..._.omit(surveyTheme, '_id'),
        survey: surveyDocId,
        company,
        team
      });

      surveyThemeDoc._logo = surveyTheme.logo;
      surveyThemeDoc._bgImgCloudinary = surveyTheme.bgImgCloudinary;
      surveyThemeDoc._uploadSurvey = true; // clone images

      await surveyThemeDoc.save({ session });
    }

    return surveyDoc._id;
  } catch (e) {
    return Promise.reject(e);
  }
}

async function _cloneImage(doc, key, actionName) {
  try {
    const secure_url = _.get(doc, `${key}.secure_url`);

    if (!secure_url) return;

    doc[key] = await cloudinaryUploader.uploadImage({
      company: doc.company,
      encodedFile: secure_url,
      entity: doc,
      actionName
    });
  } catch (e) {
    return Promise.reject(e);
  }
}
