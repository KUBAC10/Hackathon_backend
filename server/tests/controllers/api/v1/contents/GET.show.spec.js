import request from 'supertest';
import httpStatus from 'http-status';
import chai, { expect } from 'chai';
import app from 'index';

// helpers
import cleanData from 'server/tests/testHelpers/cleanData';

// factories
import {
  contentFactory,
  globalConfigFactory
} from 'server/tests/factories';

chai.config.includeStack = true;

let content;
let primaryContent;

async function makeTestData() {
  content = await contentFactory({ nameShort: 'de' });
  primaryContent = await contentFactory({});
  await globalConfigFactory({ primaryContent });
}

describe('## GET /api/v1/contents', () => {
  before(cleanData);

  before(makeTestData);

  it('should return content entity by lang flag', async () => {
    const res = await request(app)
      .get('/api/v1/contents')
      .query({
        lang: 'de'
      })
      .expect(httpStatus.OK);
    expect(res.body.resource._id).to.be.eq(content._id.toString());
  });

  it('should return primary content when content by lang not exists', async () => {
    const res = await request(app)
      .get('/api/v1/contents')
      .query({
        lang: 'qwerty'
      })
      .expect(httpStatus.OK);
    expect(res.body.resource._id).to.be.eq(primaryContent._id.toString());
  });
});
