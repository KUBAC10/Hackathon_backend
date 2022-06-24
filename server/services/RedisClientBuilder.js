import redis from 'redis';
import Promise from 'bluebird';
import config from '../../config/env';

class RedisClientBuilder {
  initialize() {
    this.client = Promise.promisifyAll(redis.createClient());
    this.auth();
    this.setDbNumber();
    this.selectDb();
    this.checkClient();
  }

  selectDb() {
    this.client.select(this.dbNumber);
  }

  auth() {
    this.client.auth(config.redisDbPassword);
  }

  checkClient() {
    this.client.on('error', (err) => {
      /* istanbul ignore next */
      console.error(`Error ${err}`);
    });
  }

  setDbNumber() {
    this.dbNumber = config.redisDbNumber;
  }
}

// initialize app default client
const instance = new RedisClientBuilder();
instance.initialize();
const redisClient = instance.client;

export default { RedisClientBuilder, redisClient };
