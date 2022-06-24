import path from 'path';

export default {
  env: 'staging',
  db: 'mongodb://localhost:27016/screver-staging',
  port: process.env.PORT || 3030,
  root: path.join(process.env.PWD, 'server'),
  redisDbNumber: 3
};
