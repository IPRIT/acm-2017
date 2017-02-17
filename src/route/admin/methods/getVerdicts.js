import * as models from "../../../models";
import Promise from 'bluebird';

export function getVerdictsRequest(req, res, next) {
  return Promise.resolve().then(() => {
    return getVerdicts(
      Object.assign(req.params, {
        user: req.user
      })
    );
  }).then(result => res.json(result)).catch(next);
}

export async function getVerdicts(params) {
  return models.Verdict.findAll();
}