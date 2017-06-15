import * as models from "../../../models";
import Promise from 'bluebird';
import deap from "deap";

export function getProblemRequest(req, res, next) {
  return Promise.resolve().then(() => {
    return getProblem(req.params);
  }).then(result => res.json(result)).catch(next);
}

export async function getProblem(params) {
  let {
    problemId
  } = params;
  let problem = await models.Problem.findByPrimary(problemId);
  if (!problem) {
    throw new HttpError('Problem not found');
  }
  let contests = await problem.getContests();
  return Object.assign(problem.get({ plain: true }), {
    connectedContests: contests
  });
}