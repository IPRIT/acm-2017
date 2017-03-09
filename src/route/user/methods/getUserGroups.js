import * as models from "../../../models";
import Promise from 'bluebird';

export function getUserGroupsRequest(req, res, next) {
  return Promise.resolve().then(() => {
    return getUserGroups(
      Object.assign(req.params), {
        initiatorUser: req.user
      }
    );
  }).then(result => res.json(result)).catch(next);
}

export async function getUserGroups(params) {
  let {
    user, userId,
    initiatorUser
  } = params;
  
  if (!user) {
    user = await models.User.findByPrimary(userId);
    if (!user) {
      throw new HttpError('User or Group not found');
    }
  }
  return user.getGroups();
}