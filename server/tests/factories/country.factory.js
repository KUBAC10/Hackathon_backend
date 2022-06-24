import faker from 'faker';

// models
import {
  Country
} from '../../models';

export default async function (options = {}) {
  return await Country.model.create({
    name: options.name || faker.address.country() + Math.random(),
    show: options.show || false,
    sortableId: options.sortableId
  });
}
