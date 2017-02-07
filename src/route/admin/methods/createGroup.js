import * as models from "../../../models";
import Promise from 'bluebird';
import userGroups from './../../../models/User/userGroups';
import * as contests from '../../contest/methods';

export function createGroupRequest(req, res, next) {
  let params = Object.assign(
    Object.assign(req.params, req.body), {
      user: req.user,
    }
  );
  return Promise.resolve().then(() => {
    return createGroup(params);
  }).then(result => res.json(result)).catch(next);
}

export async function createGroup(params) {
  let {
    name, color,
    userIds
  } = params;
  
  return models.Group.create({
    name, color
  }).then(group => group.setUsers(userIds).then(() => group));
}