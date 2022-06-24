import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import config from '../../config/env/';
import { redisClient } from '../services/RedisClientBuilder';

// models
import {
  TeamUser,
  User,
  Survey,
  Question
} from '../models/';

export function accessSocket(socket, next) {
  let cookie = socket.handshake.headers.cookie || socket.request.headers.cookie;
  if (!cookie) return next(new Error('Unauthorized'));
  cookie = cookie.split('; ').join(';');
  cookie = cookie.split(' =').join('=');
  cookie = cookie.split(';');

  // turning cookie into an object
  const cookieObject = {};
  for (let i = 0; i < cookie.length; i += 1) {
    cookie[i] = cookie[i].split('=');
    cookieObject[cookie[i][0]] = decodeURIComponent(cookie[i][1]);
  }

  // parse cookies
  const parsedCookie = cookieParser.signedCookies(cookieObject, config.cookieSecret);
  if (parsedCookie && parsedCookie.jwt) {
    const token = parsedCookie.jwt;
    return jwt.verify(token, config.jwtSecret, async (err, decoded) => {
      try {
        if (err) return next(new Error(err));
        if (decoded._id) {
          const result = await redisClient.getAsync(`authToken:${token}`);
          if (!result) return next(new Error('Unauthorized'));
          socket.request.user = { _id: result };
          return next();
        }
      } catch (e) {
        return next(e);
      }
    });
  }
  return next(new Error('Wrong cookie'));
}

export async function socketScope(socketUser, data) {
  let item;
  const user = await User.model.findById(socketUser).lean();

  data.user = user;

  if (data.surveyId) item = await Survey.model.findById(data.surveyId).lean();
  if (data.questionId) item = await Question.model.findById(data.questionId).lean();
  if (item) {
    if (user.isPowerUser && item.company.toString() === user.company.toString()) return true;

    const teamUser = await TeamUser.model
      .findOne({ user: user._id, team: item.team, company: item.company }).lean();
    return !!teamUser;
  }
  return false;
}

