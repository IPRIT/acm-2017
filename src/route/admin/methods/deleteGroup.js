import * as models from "../../../models";
import Promise from 'bluebird';
import userGroups from './../../../models/User/userGroups';
import * as contests from '../../contest/methods';

export function deleteGroupRequest(req, res, next) {
  let params = Object.assign(
    Object.assign(req.params, req.body), {
      user: req.user,
    }
  );
  return Promise.resolve().then(() => {
    return deleteGroup(params);
  }).then(result => res.json(result)).catch(next);
}

export async function deleteGroup(params) {
  let {
    groupId
  } = params;
  
  let group = await models.Group.findByPrimary(groupId);
  if (!group) {
    throw new HttpError('Group not found');
  }
  await group.setUsers([]);
  return group.destroy();
}