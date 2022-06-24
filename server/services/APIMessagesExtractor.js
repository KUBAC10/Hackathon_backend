import _ from 'lodash';
import { Content } from '../models';

// services
import { redisClient } from './RedisClientBuilder';

class ApiMessagesExtractor {
  constructor() {
    this.apiErrors = {};
    this.apiMessages = {};
    this.labels = {};
  }

  // initial load content
  loadData = async () => {
    try {
      // get all contents
      const contents = await Content.model.find().lean();
      if (contents.length > 0) {
        for (const content of contents) {
          await redisClient.hmsetAsync(
            `content#${content.nameShort}`,
            {
              apiErrors: JSON.stringify(content.apiErrors),
              apiMessages: JSON.stringify(content.apiMessages),
              labels: JSON.stringify(content.labels)
            }
          );
        }
      }
      return Promise.resolve('Content was loaded to Redis store!');
    } catch (e) {
      /* istanbul ignore next */
      return Promise.reject(e);
    }
  };

  // hook method
  setData = async (language, errors, messages, labels) => {
    await redisClient.hmsetAsync(
      `content#${language}`,
      {
        apiErrors: JSON.stringify(errors),
        apiMessages: JSON.stringify(messages),
        labels: JSON.stringify(labels)
      }
    );
  };

  // get error label
  getError = async (lang, type) => {
    const language = lang || 'en';
    const errors = await redisClient.hgetAsync(`content#${language}`, 'apiErrors');
    return Promise.resolve(_.get(JSON.parse(errors), type, ''));
  };

  // get message label
  getMessage = async (lang, type) => {
    const language = lang || 'en';
    const messages = await redisClient.hgetAsync(`content#${language}`, 'apiMessages');
    return Promise.resolve(_.get(JSON.parse(messages), type, ''));
  };

  // get labels
  getLabels = async (lang, type) => {
    const language = lang || 'en';
    const labels = await redisClient.hgetAsync(`content#${language}`, 'labels');
    return Promise.resolve(_.get(JSON.parse(labels), type, ''));
  }
}

const APIMessagesExtractor = new ApiMessagesExtractor();

export default APIMessagesExtractor;
