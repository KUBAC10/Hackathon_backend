import path from 'path';

export default {
  env: 'test',
  jwtSecret: 'Huf1IvGtFCHmU8hAv4BH56TRLv65A4Qs',
  db: 'mongodb://localhost:27016,localhost:27018,localhost:27019/screver-test?replicaSet=rs0',
  port: 3031,
  root: path.join(process.env.PWD, 'server'),
  redisDbNumber: 2,
  timezone: 'Europe/Kiev',
  liveDataTimeout: 0,
  liveDataRedisTTL: 1,
};
