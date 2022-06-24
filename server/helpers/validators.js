import mongoose from 'mongoose';
import { isEmail, isMobilePhone } from 'validator';

// services
import APIMessagesExtractor from '../services/APIMessagesExtractor';

const ValidationError = mongoose.Error.ValidationError;
const ValidatorError = mongoose.Error.ValidatorError;

async function emailValidator(obj, cb) {
  if (obj.isModified('email') && obj.email) {
    if (!isEmail(obj.email)) {
      try {
        const error = new ValidationError(obj);
        // get error text
        const message = await APIMessagesExtractor.getError(obj._lang, 'global.incorrectEmailFormat');
        error.errors.email = new ValidatorError({ message });
        return cb(error);
      } catch (e) {
        return cb(e);
      }
    }
  }
}

async function phoneNumberValidator(obj, cb) {
  if (obj.isModified('phoneNumber') && obj.phoneNumber) {
    const phoneNumber = obj.phoneNumber.trim().replace(/\D/g, '');
    const error = new ValidationError(obj);
    if (!isMobilePhone(phoneNumber)) {
      try {
        // get error text
        const incorrectFormat = await APIMessagesExtractor.getError(obj._lang, 'global.incorrectPhoneNumberFormat');
        error.errors.phoneNumber = new ValidatorError({
          message: incorrectFormat
        });
        return cb(error);
      } catch (e) {
        return cb(e);
      }
    }
    obj.phoneNumber = phoneNumber;
  }
}

async function metaValidator(obj, cb) {
  const error = new ValidationError(obj);
  if (obj.isModified('meta') && obj.meta) {
    const meta = obj.meta;
    if (Object.keys(meta) > 50) {
      error.errors.meta = new ValidatorError({
        message: 'Max limit of keys (50) is exceeded.'
      });
      return cb(error);
    }

    Object.keys(meta).forEach((key) => {
      if (!['string', 'number', 'boolean'].includes(typeof meta[key])) {
        error.errors.meta = new ValidatorError({
          message: 'Invalid type of value, allowed values: \'string\', \'number\', \'boolean\'.'
        });
        return cb(error);
      }
      if (typeof meta[key] === 'string' && meta[key].length > 100) {
        error.errors.meta = new ValidatorError({
          message: 'String length limit (100) is exceeded'
        });
        return cb(error);
      }
    });
  }
}

export { emailValidator, phoneNumberValidator, metaValidator };
