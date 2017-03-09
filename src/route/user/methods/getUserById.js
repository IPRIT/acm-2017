import * as models from "../../../models";
import Promise from 'bluebird';

export function getUserByIdRequest(req, res, next) {
  return Promise.resolve().then(() => {
    return getUserById(
      Object.assign(req.params), {
        initiatorUser: req.user
      }
    );
  }).then(result => res.json(result)).catch(next);
}

export async function getUserById(params) {
  let {
    userId
  } = params;
  return models.User.findByPrimary(userId)
}