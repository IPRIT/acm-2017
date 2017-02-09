import * as models from "../../../models";
import Promise from 'bluebird';
import userGroups from './../../../models/User/userGroups';
import * as contests from '../../contest/methods';

export function updateUserRequest(req, res, next) {
  let params = Object.assign(
    Object.assign(req.params, req.body), {
      user: req.user,
    }
  );
  return Promise.resolve().then(() => {
    return updateUser(params);
  }).then(result => res.json(result)).catch(next);
}

export async function updateUser(params) {
  let {
    userId,
    username,
    firstName,
    lastName,
    password,
    groupIds = [],
    accessGroup
  } = params;
  
  let userIdsBlacklist = [ 1 ];
  if (userIdsBlacklist.includes(Number(userId))) {
    throw new HttpError('You have no permissions', 403);
  }
  
  let user = await models.User.findByPrimary(userId);
  
  let update = {
    username,
    firstName,
    lastName,
    accessGroup
  };
  if (password) {
    Object.assign(update, { password });
  }
  await user.update(update);
  await user.setGroups(groupIds);
  
  return user;
}