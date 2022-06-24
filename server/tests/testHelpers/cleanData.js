import keystone from 'keystone';
import async from 'async';
import { redisClient } from '../../services/RedisClientBuilder';

export default function cleanData(done) {
  const lists = keystone.lists;

  // Clear Redis data
  redisClient.flushdb((err) => {
    if (err) return done(err);
  });

  // Clear DB data
  async.each(Object.keys(lists), (modelName, cb) => {
    lists[modelName].model
      .remove()
      .exec()
      .then(() => cb())
      .catch(er => cb(er));
  }, er => done(er));
}
