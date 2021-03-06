// TODO rewrite to ES6
/* eslint-disable */
'use strict';
var Joi = require('joi');
var find = require('lodash/find');
var defaults = require('lodash/defaults');
var ValidationError = require('./validation-error');

var defaultOptions = {
  contextRequest: false,
  allowUnknownHeaders: true,
  allowUnknownBody: true,
  allowUnknownQuery: true,
  allowUnknownParams: true,
  allowUnknownCookies: true,
  status: 400,
  statusText: 'Bad Request'
};
var globalOptions = {};

// maps the corresponding request object to an `express-validation` option
var unknownMap = {
  headers: 'allowUnknownHeaders',
  body: 'allowUnknownBody',
  query: 'allowUnknownQuery',
  params: 'allowUnknownParams',
  cookies: 'allowUnknownCookies'
};

exports = module.exports = function (schema) {
  if (!schema) throw new Error('Please provide a validation schema');

  return function (req, res, next)  {
    var errors = [];

    // Set default options
    var options = defaults({}, schema.options || {}, globalOptions, defaultOptions);

    // NOTE: mutates `errors`
    ['headers', 'body', 'query', 'params', 'cookies'].forEach(function (key) {
      var allowUnknown = options[unknownMap[key]];
      var entireContext = options.contextRequest ? req : null;
      if (schema[key]) validate(errors, req, schema[key], key, allowUnknown, entireContext);
    });

    if (errors && errors.length === 0) {
      return next();
    }

    return next(new ValidationError(errors, options));
  };
};

exports.ValidationError = ValidationError;

exports.options = function (opts) {
  if (!opts) {
    globalOptions = {};
    return;
  }

  globalOptions = defaults({}, globalOptions, opts);
};

/**
 * validate checks the current `Request` for validations
 * NOTE: mutates `request` in case the object is valid.
 */
function validate (errObj, request, schema, location, allowUnknown, context) {
  if (!request || !schema) return;

  var joiOptions = {
    context: context || request[location],
    allowUnknown: allowUnknown,
    abortEarly: false,
    stripUnknown: { objects: true }
  };

  Joi.validate(request[location], schema, joiOptions, function (errors, value) {
    if (!errors || errors.details.length === 0) {
      // mutate original request value -> set as joi validated
      request[location] = value
      return;
    }

    errors.details.forEach(function (error) {
      var errorExists = find(errObj, function (item) {
        if (item && item.field === error.path.join('.') && item.location === location) {
          item.messages.push(error.message);
          item.types.push(error.type);
          return item;
        }
        return;
      });

      if (!errorExists) {
        var errorField = (error.context && error.context._customErrorPath) || error.path;
        errObj.push({
          field: errorField.join('.'),
          location: location,
          messages: [error.message],
          types: [error.type]
        });
      }
    });
  });
}
