import User from '../models/User';

export default async function userEmailLoader(user) {
  const reloadedUser = await User
    .model
    .findById(user._id, 'email')
    .lean();

  return reloadedUser.email;
}
