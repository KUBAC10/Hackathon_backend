import hmacSHA256 from 'crypto-js/hmac-sha256';
import Base64 from 'crypto-js/enc-base64';

const secret = 'webhooksecret123';

/** POST /api/v1/test-webhook */
function webhook(req, res) {
  // get header sign
  const sign = req.headers['x-api-signature'];
  if (!sign) return res.sendStatus(400);

  const { x, y } = req.body;

  // check only "valid" values of test-data
  const data = {};
  if (x === 'test') data.x = x;
  if (y === 1) data.y = 1;

  // build body sign
  const bodySign = Base64.stringify(hmacSHA256(JSON.stringify(data), secret));

  // compare signs and return status
  return res.json({ message: sign === bodySign ? 'valid' : 'invalid' });
}

export default {
  webhook
};
