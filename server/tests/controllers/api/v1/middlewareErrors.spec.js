import request from 'supertest';
import httpStatus from 'http-status';
import chai, { expect } from 'chai';
import app from 'index';

// helpers
import cleanData from 'server/tests/testHelpers/cleanData';

chai.config.includeStack = true;

describe('## Middleware errors', () => {
  before(cleanData);

  it('should return error for not exists route', async () => {
    const res = await request(app)
      .get('/api/v1/invalid-route')
      .query()
      .expect(httpStatus.NOT_FOUND);
    expect(res.body.message).to.be.eq('Not Found');
  });
});
