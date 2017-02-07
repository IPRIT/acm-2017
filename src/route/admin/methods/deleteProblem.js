import * as models from "../../../models";
import Promise from 'bluebird';

export function deleteProblemRequest(req, res, next) {
  let params = Object.assign(
    Object.assign(req.params, req.body), {
      user: req.user,
    }
  );
  return Promise.resolve().then(() => {
    return deleteProblem(params);
  }).then(result => res.json(result)).catch(next);
}

export async function deleteProblem(params) {
  let {
    problemId
  } = params;
  
  let problem = await models.Problem.findByPrimary(problemId);
  return problem && problem.destroy();
}