import Promise from 'bluebird';
import * as models from "../../../models";
import { extractAllParams } from "../../../utils";

export function updateGroupRequest(req, res, next) {
  let params = Object.assign(
    Object.assign(req.params, req.body), {
      user: req.user,
    }
  );
  return Promise.resolve().then(() => {
    return updateGroup(extractAllParams(req));
  }).then(result => res.json(result)).catch(next);
}

export async function updateGroup(params) {
  let {
    groupId,
    name, color,
    userIds = [],
    user
  } = params;
  
  const group = await models.Group.findByPrimary(groupId);

  if (!group) {
    throw new HttpError('Group not found');
  }

  if (user.isModerator) {
    if (!userIds.includes(user.id)) {
      userIds.push(user.id);
    }
  }

  await group.setUsers(userIds);
  
  return group.update({ name, color });
}