import {
  CompanyLimitation,
  GlobalConfig
} from '../models';

export default async function addTranslationsLimitations(done) {
  try {
    const globalConfig = await GlobalConfig.model.findOne();
    await globalConfig.save();

    const companyLimitations = await CompanyLimitation.model.find();

    for (const limitation of companyLimitations) {
      limitation.translationChars = globalConfig.companyLimitation.translationChars;
      await limitation.save();
    }

    done();
  } catch (e) {
    console.error('Updates error: 0.0.55 addTranslationsLimitations', e);
    done(e);
  }
}
