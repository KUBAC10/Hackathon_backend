import csv from 'csv';
import httpStatus from 'http-status';

// models
import { Asset, Survey } from '../../../models';

// config
import config from '../../../../config/env';

// helpers
import { hasAccess } from '../../helpers';

/**
 * GET /api/v1/assets/survey-links-csv
 * Generate CSV file with public survey links for each asset
 * */
async function surveyLinksCSV(req, res, next) {
  try {
    const { surveyId, language } = req.query;

    // load survey in current scope
    const survey = await Survey.model
      .findOne({ _id: surveyId, publicAccess: true })
      .populate('company', 'urlName')
      .lean();

    if (!survey) return res.sendStatus(httpStatus.NOT_FOUND);

    if (!hasAccess(survey, req.scopes)) return res.sendStatus(httpStatus.FORBIDDEN);

    // load all assets in current team, company
    const assets = await Asset.model
      .find(req.scopes)
      .lean();

    if (assets.length) {
      // parse results data
      const data = assets.map((asset) => {
        const resultRow = [];

        // set Asset name
        resultRow.push(asset.name);

        // set public URL with current asset
        resultRow.push(`${config.hostname}/${survey.company.urlName}/${survey.urlName}?assets=${asset._id.toString()}`);

        return resultRow;
      });

      const columns = ['Asset name', 'Public URL'];

      // stringify data and send CSV
      return csv.stringify(data, { columns, header: true }, (err, output) => {
        res.contentType('text/csv');
        res.setHeader('Content-disposition', `attachment; filename=${survey.name[language]}-assets-links.csv`);
        return res.send(output);
      });
    }

    return res.sendStatus(httpStatus.NO_CONTENT);
  } catch (e) {
    return next(e);
  }
}

export default { surveyLinksCSV };
