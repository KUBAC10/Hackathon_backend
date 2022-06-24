import chai, { expect } from 'chai';
import moment from 'moment';
import app from '../../..'; // eslint-disable-line

// helpers
import cleanData from '../testHelpers/cleanData';

// models
import { Trash } from '../../models';

// factory
import {
  companyFactory,
  teamFactory,
  trashFactory
} from '../factories';

// cron
import clearTrash from '../../cron/clearTrash';

chai.config.includeStack = true;

let company;
let team;
let expiredTrash;
let notExpiredTrash;

async function makeTestData() {
  // create company and team
  company = await companyFactory({});
  team = await teamFactory({ company: company._id });
}

describe('## clearTrash()', () => {
  before(cleanData);

  before(makeTestData);

  beforeEach(async () => {
    expiredTrash = await trashFactory({ company, team, expireDate: moment().subtract(1, 'days') });
    notExpiredTrash = await trashFactory({ company, team, expireDate: moment().add(1, 'days') });
  });

  it('should process expired items', async () => {
    await clearTrash();

    const expiredTrashReload = await Trash.model.findById(expiredTrash._id);
    expect(expiredTrashReload).to.be.eq(null);
  });

  it('should not process items that are not expired', async () => {
    await clearTrash();

    const notExpiredTrashReload = await Trash.model.findById(notExpiredTrash._id);
    expect(notExpiredTrashReload).to.be.an('object');
    expect(notExpiredTrashReload.stage).to.be.eq('initial');
  });

  it('should process not expire items with clear stage', async () => {
    notExpiredTrash.stage = 'clearing';
    await notExpiredTrash.save();

    await clearTrash();

    const notExpiredTrashReload = await Trash.model.findById(notExpiredTrash._id);
    expect(notExpiredTrashReload).to.be.eq(null);
  });
});
