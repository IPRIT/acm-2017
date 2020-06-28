import * as models from "../../../models";
import Promise from 'bluebird';
import {extractAllParams, valueBetween} from "../../../utils/utils";
import userGroups from "../../../models/User/userGroups";

export function searchUsersRequest(req, res, next) {
  return Promise.resolve().then(() => {
    return searchUsers(extractAllParams(req));
  }).then(result => res.json(result)).catch(next);
}

export async function searchUsers(params) {
  let {
    q = '', offset = 0, count = 10, user
  } = params;
  
  let limit = valueBetween(count, 1, 200);
  offset = valueBetween(offset, 0);

  const accessGroups = [
    userGroups.groups.user.mask,
    userGroups.groups.moderator.mask
  ];

  if (user.isAdmin) {
    accessGroups.push(userGroups.groups.admin.mask);
  }
  
  let where = {
    accessGroup: {
      $in: accessGroups
    },
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