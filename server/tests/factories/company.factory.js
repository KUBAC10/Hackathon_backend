import faker from 'faker';
import _ from 'lodash';

// models
import {
  Company
} from '../../models';

// factories
import { countryFactory } from './index';

export async function attributes(options = {}, onlyId, omit = []) {
  const address = options.address || {};
  const openTextConfig = options.openTextConfig || {};

  const res = {
    name: options.name || faker.lorem.word() + Math.random(),
    urlName: options.urlName || _.deburr(_.kebabCase(faker.name.title() + Math.random())),
    address: {
      street: address.street || faker.address.streetName(),
      zipCode: address.zipCode || faker.address.zipCode(),
      city: address.city || faker.address.city(),
      country: address.country || await countryFactory({}).then(i => (onlyId ? i._id : i))
    },
    email: faker.internet.email(),
    acceptedAt: options.acceptedAt,
    colors: { primary: '#000001', secondary: '#000002' } || options.colors,
    openTextConfig: {
      active: openTextConfig.active,
      popupMessage: openTextConfig.popupMessage,
      requiredNotifications: openTextConfig.requiredNotifications,
      disableTextQuestions: openTextConfig.disableTextQuestions
    },
    isLite: options.isLite
  };
  if (omit.length) omit.forEach(k => delete res[k]);
  return res;
}

export default async function (options = {}, onlyId) {
  return await Company.model.create(await attributes(options, onlyId));
}
