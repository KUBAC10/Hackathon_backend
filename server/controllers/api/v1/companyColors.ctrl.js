import httpStatus from 'http-status';
import _ from 'lodash';

// models
import { Company } from '../../../models';

async function update(req, res, next) {
  try {
    const { colors, companyColors } = req.body;

    // find company
    const company = await Company.model.findById(req.scopes.company);

    if (!company) return res.sendStatus(httpStatus.NOT_FOUND);

    company._companyColors = companyColors;
    company.colors = _.merge(company.colors, colors);

    await company.save();

    const reloadedDoc = await Company.model.findById(req.scopes.company).populate('companyColors');

    return res.json(reloadedDoc);
  } catch (e) {
    /* istanbul ignore next */
    next(e);
  }
}

export default {
  update
};
