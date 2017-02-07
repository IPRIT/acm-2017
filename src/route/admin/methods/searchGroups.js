import * as models from "../../../models";
import Promise from 'bluebird';
import userGroups from './../../../models/User/userGroups';
import { valueBetween } from "../../../utils/utils";

export function searchGroupsRequest(req, res, next) {
  return Promise.resolve().then(() => {
    return searchGroups(req.query);
  }).then(result => res.json(result)).catch(next);
}

export async function searchGroups(params) {
  let {
    q = '', count = 20, offset = 0
  } = params;
  
  let limit = valueBetween(count, 0, 200);
  offset = valueBetween(offset, 0);
  
  let where = {
    name: {
      $like: `%${q}%`
    }
  };
  return models.Group.findAll({
    where, limit, offset
  }).map(async group => {
    let population = await group.countUsers();
    return Object.assign(group.get({ plain: true }), { population });
  }).then(async groups => {
    return {
      groups,
      groupsNumber: await models.Group.count({ where })
    }
  });
}