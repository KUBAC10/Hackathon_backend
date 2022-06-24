import { GlobalConfig } from '../models';

export default async function createGlobalConfig(done) {
  try {
    // check if already present
    const gc = await GlobalConfig.model.find().countDocuments();
    if (gc) return done();

    await GlobalConfig.model.create({
      name: 'Global Config',
      adminEmail: 'admin@example.com'
    });

    done();
  } catch (e) {
    done(e);
  }
}
