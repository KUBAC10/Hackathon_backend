import path from 'path';

export default {
  env: 'production',
  db: `mongodb://localhost:27016,localhost:27018,localhost:27019/${process.env.MONGODB_DBNAME}?replicaSet=rs0`,
  port: process.env.PORT || 3030,
  root: path.join(process.cwd(), 'server'),
  redisDbNumber: 0,
  timezone: process.env.TIMEZONE,
  liveDataTimeout: 3000,
  liveDataRedisTTL: 3,
};
