import request from 'supertest';
import httpStatus from 'http-status';
import chai, { expect } from 'chai';
import app from 'index';

// helpers
import cleanData from 'server/tests/testHelpers/cleanData';

// factories
import {
  termFactory,
} from 'server/tests/factories';

chai.config.includeStack = true;

let term;

async function makeTestData() {
  term = await termFactory({ nameShort: 'de' });
}

describe('## GET /api/v1/contents', () => {
  before(cleanData);

  before(makeTestData);

  it('should return terms entity by lang flag', async () => {
    const res = await request(app)
      .get('/api/v1/terms')
      .query({
        lang: 'de'
      })
      .expect(httpStatus.OK);
    expect(res.body.resource._id).to.be.eq(term._id.toString());
  });

  it('should reject not found', async () => {
    await request(app)
      .get('/api/v1/terms')
      .query({
        lang: 'en'
      })
      .expect(httpStatus.NOT_FOUND);
  });
});
