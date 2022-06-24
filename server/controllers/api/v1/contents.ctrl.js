import _ from 'lodash';

// models
import { Content, GlobalConfig } from '../../../models';

/** GET /api/v1/contents */
async function show(req, res, next) {
  const { lang, getCSV } = req.query;
  //console.log(Content.field('labels'))
  try {
    let content = await Content.model
      .findOne({ nameShort: lang }, '-createdAt -updatedAt -__v -updatedBy -createdBy -apiErrors -apiMessages');
      //console.log(content)/////////////////////////////////////////////////////////////////////
    const appConfig = await GlobalConfig.model
      .findOne({})
      .populate({
        path: 'primaryContent',
        select: '-createdAt -updatedAt -__v -updatedBy -createdBy -apiErrors -apiMessages'
      });
      //console.log(appConfig)/////////////////////////////////////////////////////////////////////
    if (!content) {
      content = appConfig.primaryContent;
    }
    //console.log(content)////////////////////////////////////////////////////////////////////////////
    if (getCSV) {
      //  clear content data for empty and boolean values (locks)
      const clearedContent = _.pickBy(content.labels, (val) => {
        if (!val || _.isEmpty(val)) return false;
        return true;
      });

      //  csv string for further generation
      let csvToSend = 'key;value\n';

      //  generate a string for csv file
      Object.keys(clearedContent)
        .forEach((key) => {
          csvToSend += `${key};${clearedContent[key]}\n`;
        });

      //  csv filename and type
      res.attachment('localization.csv');
      res.header('Content-Type', 'text/csv');
      res.send(csvToSend);
    }

    const fieldsForResponse = [
      'labels',
      'nameShort',
      'favicon16x16',
      'favicon32x32',
      '_id',
      'name'
    ];

    //  clearing response
    const parsedContent = _.pick(content, fieldsForResponse);

    // add support email
    parsedContent.supportEmail = appConfig.supportEmail;

    res.json({ resource: parsedContent });
  } catch (e) {
    /* istanbul ignore next */
    return next(e);
  }
}

export default { show };
