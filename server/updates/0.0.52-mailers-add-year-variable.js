//  helpers
import { initSession } from '../helpers/transactions';

//  models
import {
  Mailer,
  GlobalMailer
} from '../models';

export default async function mailersAddYearVariable(done) {
  const session = await initSession();

  try {
    const [
      globalMailers,
      mailers
    ] = await Promise.all([
      GlobalMailer.model
        .find({ template: { $regex: '2019', $options: 'i' } })
        .select('templateVariables template')
        .lean(),
      Mailer.model
        .find({ template: { $regex: '2019', $options: 'i' } })
        .select('templateVariables template')
        .lean()
    ]);

    await session.withTransaction(async () => {
      for (const mailer of globalMailers) {
        let { templateVariables, template } = mailer;

        templateVariables = JSON.parse(templateVariables);
        templateVariables.year = 'year';
        templateVariables = JSON.stringify(templateVariables);
        template = mailer.template.replace(2019, '${year}');

        await GlobalMailer.model
          .updateOne({ _id: mailer._id }, { templateVariables, template }, { session });
      }

      for (const mailer of mailers) {
        let { template } = mailer;

        template = mailer.template.replace(2019, '${year}');

        await Mailer.model
          .updateOne({ _id: mailer._id }, { template }, { session });
      }
    });

    return done();
  } catch (e) {
    console.log('Update error: mailers add year variable');
    return done(e);
  }
}
