import express from 'express';
import apicache from 'apicache';

import validate from '../controllers/paramsValidation/v1/validation';
import config from '../../config/env';
import { redisClient } from '../services/RedisClientBuilder';

// routes
import authenticationRoutes from './v1/authentication.route';
import contentsRoutes from './v1/content.route';
import contactsRoutes from './v1/contact.route';
import countriesRoutes from './v1/country.route';
import contactUsRoutes from './v1/contactUs.route';
import registrationRoutes from './v1/registration.route';
import userSelfRoutes from './v1/userSelf.route';
import usersRoutes from './v1/users.route';
import surveyRoutes from './v1/survey.route';
import templateRoutes from './v1/template.route';
import globalTemplateRoutes from './v1/globalTemplate.route';
import surveyPreviewRoutes from './v1/surveyPreview.route';
import invitationRoutes from './v1/invitation.route';
import invitationContactRoutes from './v1/invitationContact.route';
import questionRoutes from './v1/question.route';
import dashboardRoutes from './v1/dashboard.route';
import manageTagsRoutes from './v1/manageTags.route';
import emailsRoutes from './v1/emails.route';
import mailersRoutes from './v1/mailers.route';
import reportsRoutes from './v1/reports.route';
import segmentsRoutes from './v1/segments.route';
import correlationRoutes from './v1/correlation.route';
import uploadsRoutes from './v1/upload.route';
import assetsRoutes from './v1/assets.route';
import surveyAnswersRoutes from './v1/surveyAnswer.route';
import applicationRoutes from './v1/application.route';
import termsRoutes from './v1/terms.route';
import companyImages from './v1/companyImage.route';
import companyColorsRoutes from './v1/companyColors.route';
import companyOpenTextRoutes from './v1/companyOpenText.route';
import draftsRoute from './v1/drafts.route';
import translationRoutes from './v1/translation.route';
import surveyResults from './v1/surveyResults.route';
import trashRoutes from './v1/trash.route';
import faqRoutes from './v1/faq.route';
import testWebhookRoutes from './v1/testWebhook.route';
import surveyItemRoutes from './v1/surveyItem.route';
import teamRoutes from './v1/team.route';
import companiesRoute from './v1/companies.route';
import surveyThemesRoutes from './v1/surveyThemes.route';
import distributeRoutes from './v1/distribute.route';
import surveyReportRoute from './v1/surveyReports.route';
import advancedAnalyzeRoute from './v1/advancedAnalyze.route';
import companyLimitation from './v1/companyLimitation.route';
import tagsRoutes from './v1/tags.route';
import targetsRoutes from './v1/targets.route';
import widgetsRoutes from './v1/widgets.route';
import tableauRoutes from './v1/tableau.route';

import surveyV2Routes from './v2/survey.route';
import webhookV2Routes from './v2/webhook.route';
import surveyItemsV2Routes from './v2/surveyItems.route';
import surveyResultV2Routes from './v2/surveyResult.route';

const router = new express.Router();

const cacheWithRedis = apicache.options({
  redisClient,
  statusCodes: {
    include: [200]
  },
  debug: config.env === 'development',
  enabled: true
}).middleware;

/**
 * API Validation Check
 */
const schema = Joi => ({ body: { field: Joi.string().required() } });
router.post('/validation-check', validate(schema), (req, res) => {
  res.sendStatus(200);
});

/**
 * API v1 Routes
 */
// mount authentication routes at /v1/authentication
router.use('/v1/authentication', authenticationRoutes);
// mount contents routes at /v1/contents
router.use('/v1/contents', cacheWithRedis('60 seconds'), contentsRoutes);
// mount countries routes at /v1/countries
router.use('/v1/terms', cacheWithRedis('60 seconds'), termsRoutes);
// mount countries routes at /v1/countries
router.use('/v1/countries', cacheWithRedis('60 seconds'), countriesRoutes);
// mount contacts routes at /v1/contacts
router.use('/v1/contacts', contactsRoutes);
// mount contacts routes at /v1/companies
router.use('/v1/companies', companiesRoute);
// mount contact-us routes at /v1/contact-us
router.use('/v1/contact-us', contactUsRoutes);
// mount registration routes at /v1/registration
router.use('/v1/registration', registrationRoutes);
// mount user-self routes at /v1/user-self
router.use('/v1/user-self', userSelfRoutes);
// mount users routes at /v1/users
router.use('/v1/users', usersRoutes);
// mount tag-entities routes at /v1/registration
router.use('/v1/manage-tags', manageTagsRoutes);
// mount survey routes at /v1/surveys
router.use('/v1/surveys', surveyRoutes);
// mount template routes at /v1/templates
router.use('/v1/templates', templateRoutes);
// mount template routes at /v1/global-templates
router.use('/v1/global-templates', globalTemplateRoutes);
// mount survey results routes at /v1/survey-results
router.use('/v1/survey-preview', surveyPreviewRoutes);
// mount invitation routes at /v1/invitation
router.use('/v1/invitation', invitationRoutes);
// mount invitation contact routes at /v1/invitation-contact
router.use('/v1/invitation-contact', invitationContactRoutes);
// mount survey results routes at /v1/questions
router.use('/v1/questions', questionRoutes);
// mount dashboard routes at /v1/dashboard
router.use('/v1/dashboards', dashboardRoutes);
// mount dashboard routes at /v1/emails
router.use('/v1/emails', emailsRoutes);
// mount dashboard routes at /v1/mailers
router.use('/v1/mailers', mailersRoutes);
// mount reports routes at /v1/reports
router.use('/v1/reports', reportsRoutes);
// mount segments routes at /v1/reports
router.use('/v1/segments', segmentsRoutes);
// mount correlation routes at /v1/correlation
router.use('/v1/correlation', correlationRoutes);
// mount uploads routes at /v1/uploads
router.use('/v1/uploads', uploadsRoutes);
// mount images routes at /v1/company-images
router.use('/v1/company-images', companyImages);
// mount assets routes at /v1/assets
router.use('/v1/assets', assetsRoutes);
// mount survey-answers routes at /v1/survey-answers
router.use('/v1/survey-answers', surveyAnswersRoutes);
// mount survey results routes at /v1/survey-results
router.use('/v1/survey-results', surveyResults);
// mount survey item routes at /v1/survey-items
router.use('/v1/survey-items', surveyItemRoutes);
// mount team routes at /v1/teams
router.use('/v1/teams', teamRoutes);
// mount company-colors routes at /v1/company-colors
router.use('/v1/company-colors', companyColorsRoutes);
// mount drafts routes at /v1/drafts
router.use('/v1/drafts', draftsRoute);
// mount drafts routes at /v1/distribute
router.use('/v1/distribute', distributeRoutes);
// mount theme routes at /v1/themes
router.use('/v1/survey-themes', surveyThemesRoutes);
// mount translation routes at /v1/translation
router.use('/v1/translation', translationRoutes);
// mount trash routes at /v1/trash
router.use('/v1/trash', trashRoutes);
// mount trash routes at /v1/company-open-text
router.use('/v1/company-open-text', companyOpenTextRoutes);
// mount faq routes at /v1/faq
router.use('/v1/faq', faqRoutes);
// mount test-webhook routes at /v1/test-webhook
router.use('/v1/test-webhook', testWebhookRoutes);
// mount survey-reports routes at /v1/survey-reports
router.use('/v1/survey-reports', surveyReportRoute);
// mount insights routes at /v1/advanced-analyze
router.use('/v1/advanced-analyze', advancedAnalyzeRoute);
// mount company-limitations routes at /v1/company-limitations
router.use('/v1/company-limitations', companyLimitation);
// mount tags routes at /v1/tags
router.use('/v1/tags', tagsRoutes);
// mount targets routes at /v1/targets
router.use('/v1/targets', targetsRoutes);
// mount widgets routes at /v1/widgets
router.use('/v1/widgets', widgetsRoutes);
// mount targets routes at /v1/tableau
router.use('/v1/tableau', tableauRoutes);
// mount application routes at /v1/application
router.use('/v1', applicationRoutes);
/**
 * API v2 Routes
 */
// mount survey routes at /v2/surveys
router.use('/v2/surveys', surveyV2Routes);
// mount survey results routes at /v2/questions
router.use('/v2/survey-items', surveyItemsV2Routes);
// mount survey results routes at /v2/survey-results
router.use('/v2/survey-results', surveyResultV2Routes);
// mount webhook routes at /v2/webhooks
router.use('/v2/webhooks', webhookV2Routes);

export default router;
