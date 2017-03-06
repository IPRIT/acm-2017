import * as models from "../../../models";
import Promise from 'bluebird';

export function deleteUserRequest(req, res, next) {
  let { userId } = req.params;
  return Promise.resolve().then(() => {
    return deleteUser(
      Object.assign(req.body, {
        userId,
        user: req.user
      })
    );
  }).then(result => res.json(result)).catch(next);
}

export async function deleteUser(params) {
  let {
    userId
  } = params;
  
  let userIdsBlacklist = [ 1, 2 ];
  if (userIdsBlacklist.includes(Number(userId))) {
    throw new HttpError('You have no permissions');
  }
  
  let user = await models.User.findByPrimary(userId);
  if (user) {
    await user.update({
      username: `${user.username}_deleted_${Math.random()}`
    });
  }
  return user && user.destroy();
}