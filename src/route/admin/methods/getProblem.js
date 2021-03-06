import * as models from "../../../models";
import Promise from 'bluebird';

export function getProblemRequest(req, res, next) {
  return Promise.resolve().then(() => {
    return getProblem(req.params);
  }).then(result => res.json(result)).catch(next);
}

export async function getProblem(params) {
  let {
    problemId
  } = params;
  
  return models.Problem.findByPrimary(problemId);
}