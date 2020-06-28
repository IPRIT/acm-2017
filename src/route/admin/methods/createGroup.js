import Promise from 'bluebird';
import { extractAllParams } from "../../../utils";

export function createGroupRequest(req, res, next) {
  return Promise.resolve().then(() => {
    return createGroup(extractAllParams(req));
  }).then(result => res.json(result)).catch(next);
}

export async function createGroup(params) {
  const {
    name,
    color,
    userIds,
    user
  } = params;

  if (user.isModerator) {
    userIds.push(user.id);
  }
  
  return user.createAuthoredGroup({ name, color }).then(group => {
    return group.setUsers(userIds).then(() => group);
  });
}