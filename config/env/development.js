import path from 'path';

export default {
  env: 'development',
  MONGOOSE_DEBUG: true,
  db: 'mongodb://localhost:27016,localhost:27018,localhost:27019/screver-development?replicaSet=rs0',
  port: 3030,
  root: path.join(process.env.PWD, 'server'),
  redisDbNumber: 1,
  timezone: 'Europe/Kiev',
  liveDataTimeout: 0,
  liveDataRedisTTL: 1,
};
