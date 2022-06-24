import request from 'supertest';
import app from 'index';

export default async function v2authRequest(clientId, clientSecret) {
  return await request(app)
    .post('/oauth/token')
    .send({ grant_type: 'client_credentials' })
    .auth(clientId, clientSecret);
}
