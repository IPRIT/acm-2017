import * as models from "../../../models";
import Promise from 'bluebird';
import userGroups from './../../../models/User/userGroups';

export function searchGroupsRequest(req, res, next) {
  return Promise.resolve().then(() => {
    return searchGroups(req.query);
  }).then(result => res.json(result)).catch(next);
}

export async function searchGroups(params) {
  let {
    q
  } = params;
  
  return models.Group.findAll({
    where: {
      name: {
        $like: `%${q}%`
      }
    }
  });
}