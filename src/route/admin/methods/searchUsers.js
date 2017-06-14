import * as models from "../../../models";
import Promise from 'bluebird';
import { valueBetween } from "../../../utils/utils";

export function searchUsersRequest(req, res, next) {
  return Promise.resolve().then(() => {
    return searchUsers(req.query);
  }).then(result => res.json(result)).catch(next);
}

export async function searchUsers(params) {
  let {
    q = '', offset = 0, count = 10
  } = params;
  
  let limit = valueBetween(count, 1, 200);
  offset = valueBetween(offset, 0);
  
  let where = {
    $or: {
      firstName: {
        $like: `%${q}%`
      },
      lastName: {
        $like: `%${q}%`
      },
      username: {
        $like: `%${q}%`
      }
    }
  };
  return models.User.findAll({
    where,
    offset,
    limit
  }).then(async users => {
    return {
      users,
      q,
      usersNumber: await models.User.count({
        where
      })
    };
  });
}