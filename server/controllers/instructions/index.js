/**
 * Instructions for CRUD operations of project entities
 * Used by application.route.js
 * For override action - add own endpoint at routes
 * */

import tags from './tags';
import users from './users';
import teams from './teams';
import surveys from './surveys';
import contacts from './contacts';
import questions from './questions';
import tagEntities from './tagEntities';
import teamUsers from './teamUsers';
import mailers from './mailers';
import emails from './emails';
import surveyResults from './surveyResults';
import assets from './assets';
import companyImages from './companyImages';
import trashes from './trashes';

export default {
  trashes,
  assets,
  tags,
  users,
  teams,
  surveys,
  contacts,
  questions,
  tagEntities,
  mailers,
  emails,
  teamUsers,
  surveyResults,
  companyImages
};
