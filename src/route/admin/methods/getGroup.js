import * as models from "../../../models";
import Promise from 'bluebird';
import filter from "../../../utils/filter";

export function getGroupRequest(req, res, next) {
  return Promise.resolve().then(() => {
    return getGroup(req.params);
  }).then(result => res.json(result)).catch(next);
}

export async function getGroup(params) {
  let {
    groupId
  } = params;
  
  let group = await models.Group.findByPrimary(groupId);
  if (!group) {
    throw new HttpError('Group not found');
  }
  let users = await group.getUsers().then(users => {
    return users.map(user => {
      return filter(user.get({ plain: true }), {
        exclude: [ 'UsersToGroups' ]
      });
    });
  });
  return { group, users };
}