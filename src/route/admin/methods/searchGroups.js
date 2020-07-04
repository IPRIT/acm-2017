import * as models from "../../../models";
import Promise from 'bluebird';
import userGroups from './../../../models/User/userGroups';
import {extractAllParams, valueBetween} from "../../../utils/utils";

export function searchGroupsRequest(req, res, next) {
  return Promise.resolve().then(() => {
    return searchGroups(extractAllParams(req));
  }).then(result => res.json(result)).catch(next);
}

export async function searchGroups(params) {
  let {
    q = '', count = 20, offset = 0, user
  } = params;
  
  let limit = valueBetween(count, 0, 200);
  offset = valueBetween(offset, 0);
  
  let where = {
    name: {
      $like: `%${q}%`
    }
  };

  const findFn = user.isAdmin
    ? models.Group.findAll.bind(models.Group)
    : user.getGroups.bind(user);
  const countFn = user.isAdmin
    ? models.Group.count.bind(models.Group)
    : user.countGroups.bind(user);

  return findFn({
    where, limit, offset,
    include: [{
      model: models.User,
      required: !user.isAdmin,
      association: models.Group.associations.Author
    }],
    order: [['id', 'DESC']]
  }).map(async group => {
    return Object.assign(group.get({ plain: true }), { population: await group.countUsers() });
  }).then(async groups => {
    return {
      groups,
      groupsNumber: await countFn({ where })
    }
  });
}