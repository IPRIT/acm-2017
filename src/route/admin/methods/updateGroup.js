import * as models from "../../../models";
import Promise from 'bluebird';
import userGroups from './../../../models/User/userGroups';
import * as contests from '../../contest/methods';

export function updateGroupRequest(req, res, next) {
  let params = Object.assign(
    Object.assign(req.params, req.body), {
      user: req.user,
    }
  );
  return Promise.resolve().then(() => {
    return updateGroup(params);
  }).then(result => res.json(result)).catch(next);
}

export async function updateGroup(params) {
  let {
    groupId,
    name, color,
    userIds
  } = params;
  
  let group = await models.Group.findByPrimary(groupId);
  await group.setUsers(userIds);
  
  return group.update({ name, color });
}