import chai, { expect } from 'chai';

import app from 'index'; // eslint-disable-line

// helpers
import cleanData from 'server/tests/testHelpers/cleanData';
// models
import { Country } from 'server/models';

import { initSessionWithTransaction } from '../helpers/transactions';

chai.config.includeStack = true;

describe('Mongoose transactions', () => {
  beforeEach(cleanData);

  it('should create new entity only after commit transaction', async () => {
    // Init Session
    const session = await initSessionWithTransaction();

    // create new country
    const country = new Country.model({ name: 'country' });
    await country.save({ session });

    // check new country
    const doc = await Country.model.findOne({ name: 'country' });
    expect(doc).to.be.eq(null);

    // commit transaction
    await session.commitTransaction();

    // close opened session
    session.endSession();

    // check that commited doc was created
    const createdDoc = await Country.model.findOne({ name: 'country' });
    expect(createdDoc).to.be.an('object');
  });

  it('can process multiple transactions', async () => {
    // Init first Session
    const session1 = await initSessionWithTransaction();

    // create new country
    const country = new Country.model({ name: 'country1' });
    await country.save({ session: session1 });

    // check new country
    const doc = await Country.model.findOne({ name: 'country1' });
    expect(doc).to.be.eq(null);

    // start second session
    const session2 = await initSessionWithTransaction();

    // create second country
    const country2 = new Country.model({ name: 'country2' });
    await country2.save({ session: session2 });

    // check new second country
    const secondDoc = await Country.model.findOne({ name: 'country1' });
    expect(secondDoc).to.be.eq(null);

    // commit second transaction
    await session2.commitTransaction();
    // close second transaction
    session2.endSession();

    // commit first transaction
    await session1.commitTransaction();

    // close first transaction
    session1.endSession();

    const createdDoc = await Country.model.findOne({ name: 'country1' });
    const createdSecondDoc = await Country.model.findOne({ name: 'country2' });

    expect(createdDoc).to.be.an('object');
    expect(createdSecondDoc).to.be.an('object');
  });

  it('should rollback all changes if any call in transaction was failed', async () => {
    // Init first Session
    const session1 = await initSessionWithTransaction();
    let session2;
    try {
      // create new country
      const country = new Country.model({ name: 'country1' });
      await country.save({ session: session1 });
      // check new country
      const doc = await Country.model.findOne({ name: 'country1' });
      expect(doc).to.be.eq(null);

      // start second session
      session2 = await initSessionWithTransaction();

      // create second country
      const country2 = new Country.model({ name: 'country2' });
      await country2.save({ session: session2 });

      // check new second country
      const secondDoc = await Country.model.findOne({ name: 'country2' });
      expect(secondDoc).to.be.eq(null);
      throw new Error('hi');
    } catch (e) {
      // abort second transaction
      await session2.abortTransaction();
      session2.endSession();

      // abort first transaction
      await session1.abortTransaction();
      session1.endSession();

      const doc1 = await Country.model.findOne({ name: 'country1' });
      const doc2 = await Country.model.findOne({ name: 'country2' });
      expect(doc1).to.be.eq(null);
      expect(doc2).to.be.eq(null);
    }
  });
});

