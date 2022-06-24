import htmlInput from 'joi-html-input';
import memoize from 'memoizee';

// base
import BaseJoi from 'joi';
import JoiObjectId from 'joi-objectid';

import { default as expressValidation } from '../../../../config/expressValidation';

// extension
import lessThan from '../joiExtensions/lessThan';

// localization
import { JoiErrors, localizationList } from '../../../../config/localization';

// eslint-disable-next-line new-cap
BaseJoi.objectId = JoiObjectId(BaseJoi);

const Joi = BaseJoi
  .extend(lessThan)
  .extend(htmlInput);


const customJoi = lang => (
  Joi.defaults((schema) => {
    const language = JoiErrors[lang];

    const options = {
      language,
      skipFunctions: true,
      escapeHtml: true
    };

    return schema.options(options);
  })
);

const memoizedCustomJoi = memoize(customJoi);

const getSchema = (schema, joi) => schema(joi);
const getMemSchema = memoize(getSchema);

const getLocale = lang => (localizationList.includes(lang) ? lang : 'en');

export default function validate(validationSchema) {
  return (req, res, next) => {
    const joi = memoizedCustomJoi(getLocale(req.cookies.lang));
    const schema = getMemSchema(validationSchema, joi);

    return expressValidation(schema)(req, res, next);
  };
}
