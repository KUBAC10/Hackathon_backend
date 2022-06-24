import request from 'supertest';
import httpStatus from 'http-status';
import chai, { expect } from 'chai';
import app from 'index';

// helpers
import cleanData from 'server/tests/testHelpers/cleanData';

// factories
import contentFactory from 'server/tests/factories/content.factory';
import globalConfigFactory from 'server/tests/factories/globalConfig.factory';

chai.config.includeStack = true;

let primaryContent;

async function makeTestData() {
  await contentFactory({ nameShort: 'de' });
  primaryContent = await contentFactory({});
  await globalConfigFactory({ primaryContent });
}

describe('## Validation', () => {
  before(cleanData);

  before(makeTestData);

  it('should reject without required field', async () => {
    await request(app)
      .post('/api/validation-check')
      .send({})
      .expect(httpStatus.BAD_REQUEST);
  });

  it('should reject with default en locale', async () => {
    const res = await request(app)
      .post('/api/validation-check')
      .send({})
      .expect(httpStatus.BAD_REQUEST);

    expect(res.body.message.field).to.be.eq('Is required');
  });

  it('should response with status OK for valid schema and field', async () => {
    await request(app)
      .post('/api/validation-check')
      .send({ field: 'test' })
      .expect(httpStatus.OK);
  });

  it('should reject with localization', async () => {
    const agent = request.agent(app);

    const res = await agent
      .post('/api/validation-check')
      .set('cookie', 'lang = de')
      .send({})
      .expect(httpStatus.BAD_REQUEST);

    expect(res.body.message.field).to.be.eq('Wird benötigt');
  });
});
