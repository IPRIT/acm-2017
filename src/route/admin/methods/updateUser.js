import * as models from "../../../models";
import Promise from 'bluebird';

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
    email,
    password,
    groupIds = [],
    accessGroup,
    user: initiatorUser
  } = params;
  
  let userIdsBlacklist = [ 1 ];
  if (userIdsBlacklist.includes(Number(userId)) && initiatorUser.id !== userId) {
    throw new HttpError('You have no permissions', 403);
  }
  
  let user = await models.User.findByPrimary(userId);
  
  let update = {
    username,
    firstName,
    lastName,
    email,
    accessGroup
  };
  if (password) {
    Object.assign(update, { password });
  }
  await user.update(update);
  await user.setGroups(groupIds);
  
  return user;
}