import express from 'express';
import logger from 'morgan';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import compress from 'compression';
import methodOverride from 'method-override';
import cors from 'cors';
import httpStatus from 'http-status';
import expressWinston from 'express-winston';
import helmet from 'helmet';
import keystone from 'keystone';
import session from 'express-session';
import path from 'path';
// import io from 'socket.io';
// import chalk from 'chalk';
import { createStaticRouter, createDynamicRouter } from 'keystone/admin/server';
import winston from 'winston';
// import memwatch from 'memwatch-next';
import connectRedis from 'connect-redis';
import config from './env';
import APIError from '../server/helpers/APIError';
import { redisClient } from '../server/services/RedisClientBuilder';
import expressValidation from '../config/expressValidation/index';

const app = express();

const cookieSecret = config.cookieSecret;


const RedisStore = connectRedis(session);

const redisOptions = {
  client: redisClient,
  ttl: config.ttlSession,
  logErrors: true
};

const redisSessionStore = new RedisStore(redisOptions);

if (config.env === 'development') {
  /* istanbul ignore next */
  app.use(logger('dev'));
}

// parse body params and attache them to req.body
app.use(bodyParser.json({ limit: '5mb' }));
app.use(bodyParser.urlencoded({ limit: '5mb', extended: true, parameterLimit: 5000 })); // maximum number of parameters accepted in your urlencoded request.

app.use(cookieParser(cookieSecret));
app.use(compress());
app.use(methodOverride());

// secure apps by setting various HTTP headers
app.use(helmet());

// enable CORS - Cross Origin Resource Sharing
app.use(cors());

app.use(session({
  store: redisSessionStore,
  secret: config.sessionSecret,
  resave: false,
  saveUninitialized: false
}));

// express validation global config
expressValidation.options({});

keystone.init({
  name: 'Screver Admin',
  brand: 'Screver Admin',
  session: true,
  updates: '../server/updates',
  auth: true,
  port: process.env.PORT || 3030,
  logger: true,
  'user model': 'User',
  'auto update': config.env !== 'test' && parseInt(process.env.NODE_APP_INSTANCE || 0, 10) === 0,
  'cookie secret': cookieSecret,
  'wysiwyg images': true,
  'wysiwyg additional options': {
    relative_urls: false,
    remove_script_host: false,
    convert_urls: false,
    extended_valid_elements: 'style,link[href|rel]',
    custom_elements: 'style,link,~link'
  },
  'wysiwyg menubar': true,
  'wysiwyg skin': 'lightgray',
  'wysiwyg additional buttons': 'searchreplace visualchars, charmap ltr rtl paste, forecolor media preview',
  'wysiwyg additional plugins': 'table, advlist, anchor, autolink, autosave, ' +
  ' contextmenu, directionality, hr,' +
  ' media paste, preview, searchreplace, textcolor, visualblocks, visualchars, wordcount'
});

keystone.set('mongoose', require('mongoose'));

keystone.set('cloudinary config', {
  cloud_name: config.cloudinaryCloudName,
  api_key: config.cloudinaryApiKey,
  api_secret: config.cloudinaryApiSecret
});

keystone.import('../server/models');

app.use(express.static(path.join(process.env.PWD, 'public')));
app.use(express.static(path.join(process.env.PWD, 'static')));

app.use('/keystone', createStaticRouter(keystone));
app.use('/keystone', createDynamicRouter(keystone));

keystone.app = app;


// enable detailed API logging in dev env
// if (config.env === 'development') {
//   expressWinston.requestWhitelist.push('body');
//   expressWinston.responseWhitelist.push('body');
//   app.use(expressWinston.logger({
//     transports: [
//       new (winston.transports.Console)({
//         json: true,
//         colorize: true
//       })
//     ],
//     meta: true, // optional: log meta data about request (defaults to true)
//     msg: 'HTTP {{req.method}} {{req.url}} {{res.statusCode}} {{res.responseTime}}ms',
//     colorStatus: true // Color the status code (default green, 3XX cyan, 4XX yellow, 5XX red).
//   }));
// }

// mount oauth2 routes
app.use('/oauth', require('../server/routes/oauth/oauth2.route'));

// mount scripts routes
app.use('/scripts', require('../server/routes/scripts'));

// mount all routes on /api path
app.use('/api', require('../server/routes/index.route'));

// app.post('/oauth/token', require('./oauth2'.token));

/* istanbul ignore next */
// memwatch.on('leak', (info) => {
//   /* istanbul ignore next */
//   console.log(info);
// });

// if error is not an instanceOf APIError, convert it.
app.use((err, req, res, next) => {
  if (err.name === 'ValidationError') {
    /* istanbul ignore next */
    return res.status(400).send({
      message: err.errors
    });
  }

  if (err.name === 'CompanyLimitExceeded') {
    /* istanbul ignore next */
    return res.status(400).send({
      type: 'CompanyLimitExceeded',
      message: err.message
    });
  }

  if (err instanceof expressValidation.ValidationError) {
    // validation error contains errors which is an array of error each containing message[]
    const parsedError = {};
    err.errors.forEach((error) => {
      if (!parsedError[error.field]) parsedError[error.field] = error.messages.join('; ');
    });
    const error = new APIError(parsedError, err.status, true);
    return next(error);
  } else if (!(err instanceof APIError)) {
    const apiError = new APIError(err.message, err.status, err.isPublic);
    return next(apiError);
  }
  /* istanbul ignore next */
  return next(err);
});

// catch 404 and forward to error handler
app.use((req, res, next) => {
  /* istanbul ignore next */
  const err = new APIError('API not found', httpStatus.NOT_FOUND);
  /* istanbul ignore next */
  return next(err);
});

app.use(expressWinston.errorLogger({
  transports: [
    new (winston.transports.Console)({
      json: true,
      colorize: true
    })
  ],
  dynamicMeta (req, res, err) {
    return {
      error: err.message
    };
  }
}));

// error handler, send stacktrace not during production
app.use((err, req, res, next) => {// eslint-disable-line no-unused-vars
  return res.status(err.status).json({
    message: err.isPublic ? err.message : httpStatus[err.status],
    stack: config.env !== 'production' ? err.stack : {}
  })
});

app.keystone = keystone;

export default app;
