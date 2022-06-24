import request from 'supertest';
import httpStatus from 'http-status';
import _ from 'lodash';
import chai, { expect } from 'chai';
import app from 'index';

// helpers
import cleanData from 'server/tests/testHelpers/cleanData';

// factories
import countryFactory from 'server/tests/factories/country.factory';

chai.config.includeStack = true;

async function makeTestData() {
  for (const i of _.times(5)) { // eslint-disable-line
    await countryFactory({});
  }
  for (const i of _.times(5)) { // eslint-disable-line
    await countryFactory({ show: true });
  }
  for (const i of _.times(5)) { // eslint-disable-line
    await countryFactory({ sortableId: i });
  }
}

describe('## GET /api/v1/countries', () => {
  before(cleanData);

  before(makeTestData);

  it('should return all countries which allowed for frontend', (done) => {
    request(app)
      .get('/api/v1/countries')
      .query({
        limit: 100,
      })
      .expect(httpStatus.OK)
      .then((res) => {
        expect(res.body.total).to.be.eq(5);
        done();
      })
      .catch(done);
  });


  it('should return all list of countries from answer', async () => {
    const res = await request(app)
      .get('/api/v1/countries')
      .query({
        limit: 100,
        answerList: true,
      })
      .expect(httpStatus.OK);

    expect(res.body.total).to.be.eq(15);
  });

  it('should return country by name', async () => {
    await countryFactory({ name: 'testAfghanistan', show: true });
    const res = await request(app)
      .get('/api/v1/countries')
      .query({
        limit: 100,
        name: 'testAfghanistan'
      })
      .expect(httpStatus.OK);
    expect(res.body.resources[0].name).to.be.eq('testAfghanistan');
    expect(res.body.total).to.be.eq(1);
  });
});
