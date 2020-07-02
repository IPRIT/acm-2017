import * as models from "../../../models/index";
import Promise from 'bluebird';
import { extractAllParams } from "../../../utils/index";

export function resolvePeerRequest(req, res, next) {
  let params = Object.assign(
    extractAllParams(req)
  );
  return Promise.resolve().then(() => {
    return resolvePeer(params);
  }).then(result => res.json(result)).catch(next);
}

export async function resolvePeer(params) {
  let {
    userId, user,
    peerUserId, peerUser
  } = params;
  
  if (!user) {
    user = await models.User.findByPrimary(userId);
  }
  if (!peerUser) {
    peerUser = await models.User.findByPrimary(peerUserId);
  }
  if (!user || !peerUser) {
    throw new HttpError('User not found');
  }

  const adminId = 2;
  const admin = await models.User.findByPrimary(adminId);

  if (user.isSupervisor) {
    user = admin;
    userId = adminId;
  }
  if (peerUser.isSupervisor) {
    peerUser = admin;
    peerUserId = adminId;
  }

  return peerUser.get({ plain: true });
}