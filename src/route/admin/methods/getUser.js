import { filterEntity as filter } from '../../../utils';
import * as models from "../../../models";
import Promise from 'bluebird';

export function getUserRequest(req, res, next) {
  return Promise.resolve().then(() => {
    return getUser(
      Object.assign(req.params, {
        user: req.user
      })
    );
  }).then(result => res.json(result)).catch(next);
}

export async function getUser(params) {
  let {
    userId
  } = params;
  
  return models.User.findByPrimary(userId, {
    include: [ models.Group ]
  }).then(user => {
    if (!user) {
      throw new HttpError('User not found');
    }
    return filter(user.get({ plain: true }), {
      replace: [
        [ 'Groups', 'groups' ]
      ],
      exclude: [ 'UsersToGroups' ],
      deep: true
    });
  });
}