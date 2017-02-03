import * as models from "../../../models";
import Promise from 'bluebird';
import userGroups from './../../../models/User/userGroups';

export function getProblemRequest(req, res, next) {
  return Promise.resolve().then(() => {
    return getProblem(req.params);
  }).then(result => res.json(result)).catch(next);
}

export async function getProblem(params) {
  let {
    problemId
  } = params;
  
  return models.Problem.findByPrimary(problemId).then(problem => {
    let { attachments = '{}' } = problem;
    problem.attachments = JSON.parse(attachments);
    return problem;
  });
}