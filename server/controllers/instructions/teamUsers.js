// access control
import accessControl from '../../helpers/accessControl';
import powerUser from '../access/powerUser';

export default {
  create: {
    auth: accessControl(powerUser()),
    select: 'createdAt user team company',
    populate: [
      {
        path: 'user',
        select: 'name'
      },
      {
        path: 'team',
        select: 'name logo'
      }
    ],
  },
  destroy: {
    auth: accessControl(powerUser())
  }
};
