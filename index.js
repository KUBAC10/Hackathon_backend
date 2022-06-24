import chalk from 'chalk';
import { Server } from 'socket.io';
import redisAdapter from 'socket.io-redis';
import dotObject from 'dot-object';

// config
import config from './config/env';
import app from './config/express';

// services
import { CronJobs } from './server/services';
import { RedisClientBuilder, redisClient } from './server/services/RedisClientBuilder';

// helpers
import { accessSocket, socketScope } from './server/helpers/accessSocket';

// module.parent check is required to support mocha watch
// src: https://github.com/mochajs/mocha/issues/1912
/* istanbul ignore if */
if (module.parent) {
  app.keystone.set('port', config.port);
}

// start CronJobs
if (config.env !== 'test' && parseInt(process.env.NODE_APP_INSTANCE || 0, 10) === 0) CronJobs.start();

app.keystone.set('mongo', config.db);
app.keystone.set('signin logo', '/logo.png');
app.keystone.set('nav', {
  companies: 'companies',
  contacts: ['contacts', 'contact-us', 'invites'],
  contents: 'contents',
  countries: 'countries',
  globalConfig: 'global-configs',
  users: 'users',
  mailers: ['global-mailers', 'emails', 'mailers'],
  tags: ['tags', 'tag-entities'],
  teams: ['teams', 'team-users'],
  surveys: ['surveys', 'survey-sections', 'survey-items'],
  questions: ['questions', 'question-items'],
  surveyResults: ['survey-results', 'survey-result-items']
});

app.keystone.start({
  // init sockets on keystone start
  onStart: () => {

    const httpServer = app.keystone.httpServer;

    // set socket.io to keystone module
    app.keystone.io = new Server(httpServer);

    const io = app.keystone.io;

    const pub = new RedisClientBuilder();
    pub.initialize();

    const sub = new RedisClientBuilder();
    sub.initialize();

    io.adapter(redisAdapter({ pubClient: pub.client, subClient: sub.client }));

    // check access
    io.use(accessSocket);

    io.on('connection', (socket) => {

      const { id: socketId } = socket;

      console.log(chalk.blue(`Socket ${socketId} was connected!`));

      // handle analyze event
      socket.on('analyze', async (options) => {
        try {
          const { surveyId, timeZone = config.timezone, queries = {} } = options;

          const access = await socketScope(socket.request.user, { surveyId });

          // disconnect user if do not have permissions
          if (!access) return socket.disconnect();

          // queries: {
          //   repliesQuery: { from, to },
          //   locationsQuery: { from, to },
          //   devicesQuery: { from, to },
          //   npsStatisticQuery: { from, to, surveyItems = [] },
          //   npsCommentsQuery: { from, to, surveyItems = [] || '' }
          // }

          // set queries from analyze charts to redis
          // so each chart in each socket will have its own range
          // to change query just emit another 'analyze' event
          for (const [queryKey, query] of Object.entries(queries)) {
            const hash = {};
            const dot = dotObject.dot(query);

            Object.keys(dot).forEach((key) => {
              if (dot[key] !== null) hash[key] = dot[key];
            });

            // save query to redis
            redisClient.hmset(`${socketId}#${queryKey}`, hash);
            redisClient.expire(`${socketId}#${queryKey}`, 86400); // 1 day
          }

          // save client timeZone to redis
          redisClient.set(`${socketId}#timeZone`, timeZone, 'EX', 86400); // 1 day

          // add socket to the room, to get list of connected clients in future
          // rooms and their clients stored in Sets

          await io.of('/').adapter.remoteJoin(socketId, `analyze#${surveyId}`);
        } catch (e) {
          console.error(e);
        }
      });

      // handle surveyReport event
      socket.on('surveyReport', async (options) => {
        try {
          const { surveyId, surveyReportId } = options;

          const access = await socketScope(socket.request.user, { surveyId });

          // disconnect user if do not have permissions
          if (!access) return socket.disconnect();

          // add socket in surveyReport room
          // for emitting loaded surveyReport data to appropriate clients
          await io.of('/').adapter.remoteJoin(socketId, `surveyReports#${surveyId}#${surveyReportId}`);

          // add surveyReportId to Set for getting listened surveyReport ids by surveyId
          redisClient.sadd(`surveyReports#${surveyId}`, surveyReportId);
          redisClient.expire(`surveyReports#${surveyId}`, 86400); // 1 day
        } catch (e) {
          console.error(e);
        }
      });

      // handle survey result
      socket.on('surveyResults', async (options) => {
        try {
          const { surveyId, query = {} } = options;

          const access = await socketScope(socket.request.user, options);

          // disconnect user if do not have permissions
          if (!access) return socket.disconnect();

          // add socket to room
          await io.of('/').adapter.remoteJoin(socketId, `surveyResults#${surveyId}`);

          query.company = options.user.company.toString();
          query.team = options.user.currentTeam.toString();

          const hash = {};
          const dot = dotObject.dot(query);

          Object.keys(dot).forEach((key) => {
            if (dot[key] !== null) hash[key] = dot[key];
          });

          // save query to redis
          redisClient.hmset(`${socketId}#surveyResults`, hash);
          redisClient.expire(`${socketId}#surveyResults`, 86400); // day
        } catch (e) {
          console.error(e);
        }
      });

      socket.on('disconnect', () => {
        console.log(chalk.red(`Socket ${socketId} was disconnected.`));
      });
    });

    // will be fired on socket disconnection
    io.of('/').adapter.on('leave-room', async (room, id) => {
      try {
        // whe socket last in room room === id (delete room Set)
        if (room !== id) {
          const [event, surveyId, surveyReportId] = room.split('#');

          // clear queries from redis
          if (event === 'analyze') {
            await Promise.all([
              redisClient.delAsync(`${id}#repliesQuery`),
              redisClient.delAsync(`${id}#locationQuery`),
              redisClient.delAsync(`${id}#devicesQuery`),
              redisClient.delAsync(`${id}#npsStatisticQuery`),
              redisClient.delAsync(`${id}#npsCommentsQuery`)
            ]);
          }

          // remove survey report id from redis Set of listened surveyReports
          if (event === 'surveyReport') {
            await redisClient.sremAsync(`surveyReports#${surveyId}`, surveyReportId);
          }

          // remove survey results query from redis
          if (event === 'surveyResults') {
            await redisClient.delAsync(`surveyReports#${surveyId}`);
          }
        }
      } catch (e) {
        console.error(e);
      }
    });
  }
});

// Load auth module
const auth = require('./config/auth');

app.use(auth().initialize());
// Add services to the app
const APIMessagesExtractor = require('./server/services/APIMessagesExtractor');
// Load services data
APIMessagesExtractor.loadData()
  .then(arg => console.log(chalk.blue(arg)))
  .catch((er) => {
    /* istanbul ignore next */
    console.error(er);
  });

export default app;
