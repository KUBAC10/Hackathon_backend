import {
  Company,
  CompanyLimitation,
  GlobalConfig
} from '../models';

export default async function companyLimitations(done) {
  try {
    const globalConfig = await GlobalConfig.model.findOne();

    await globalConfig.save();

    const companies = await Company.model
      .find({ isLite: true })
      .populate('companyLimitation')
      .lean();

    const companyLimitationData = companies
      .filter(c => !c.companyLimitation)
      .map(({ _id: company }) => ({ company, ...globalConfig.companyLimitation }));

    await CompanyLimitation.model.create(companyLimitationData);

    console.log(`Created ${companies.length} company limitations`);
    done();
  } catch (e) {
    console.error('Updates error: 0.0.54 company limitations', e);
    done(e);
  }
}
