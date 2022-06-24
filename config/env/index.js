const env = process.env.NODE_ENV || 'development';

if (env === 'development' || env === 'test') {
  require('dotenv').config(); // eslint-disable-line global-require
}

const config = require(`./${env}`); // eslint-disable-line import/no-dynamic-require

const defaults = {
  jwtSecret: process.env.JWT_SECRET,
  hostname: process.env.HOSTNAME,
  cookieSecret: process.env.COOKIE_SECRET,
  jwtSession: { session: false },
  sessionSecret: process.env.SESSION_SECRET,
  redisDbPassword: process.env.REDIS_DB_PASSWORD,
  ttlSession: process.env.TTL_SESSION,
  ttlAuthToken: process.env.TTL_AUTH_TOKEN,
  ttlAccessToken: process.env.TTL_ACCESS_TOKEN,
  ttlConfirmationToken: process.env.TTL_CONFIRMATION_TOKEN,
  ttlResetPasswordToken: process.env.TTL_RESET_PASSWORD_TOKEN,
  cloudinaryCloudName: process.env.CLOUDINARY_CLOUD_NAME,
  cloudinaryApiKey: process.env.CLOUDINARY_API_KEY,
  cloudinaryApiSecret: process.env.CLOUDINARY_API_SECRET,
  messagingServiceSid: process.env.TWILIO_MESSAGING_SERVICE_SID,
  linkedinClientId: process.env.LINKED_IN_CLIENT_ID,
  linkedinSecret: process.env.LINKED_IN_SECRET,
  googleClientId: process.env.GOOGLE_CLIEND_ID,
  googleSecret: process.env.GOOGLE_SECRET,
  ipStackKey: process.env.IP_STACK_KEY,
  authBasicUsername: process.env.AUTH_BASIC_USERNAME,
  authBasicPassword: process.env.AUTH_BASIC_PASSWORD
};

export default Object.assign(defaults, config);
