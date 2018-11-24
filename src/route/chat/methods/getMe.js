import * as models from "../../../models/index";
import Promise from 'bluebird';
import { extractAllParams } from "../../../utils/index";

export function getMeRequest(req, res, next) {
  let params = Object.assign(
    extractAllParams(req)
  );
  return Promise.resolve().then(() => {
    return getMe(params);
  }).then(result => res.json(result)).catch(next);
}

export async function getMe(params) {
  let {
    userId, user
  } = params;
  
  if (!user) {
    user = await models.User.findByPrimary(userId);
  }
  if (!user) {
    throw new HttpError('User not found');
  }

  const adminId = 2;
  if (user.isAdmin) {
    user = await models.User.findByPrimary(adminId);
    userId = adminId;
  }

  return user.get({ plain: true });
}