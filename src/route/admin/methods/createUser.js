import * as models from "../../../models";
import Promise from 'bluebird';
import userGroups from './../../../models/User/userGroups';
import * as contests from '../../contest/methods';

export function createUserRequest(req, res, next) {
  return Promise.resolve().then(() => {
    return createUser(
      Object.assign(req.body, {
        user: req.user
      })
    );
  }).then(result => res.json(result)).catch(next);
}

export async function createUser(params) {
  let {
    username,
    firstName,
    lastName,
    password,
    groupIds = []
  } = params;
  
  let user = await models.User.create({
    username,
    firstName,
    lastName,
    password
  });
  await user.setGroups(groupIds);
  
  return user;
}