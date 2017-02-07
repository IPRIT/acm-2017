import * as models from "../../../models";
import Promise from 'bluebird';

export function deleteSolutionRequest(req, res, next) {
  let params = Object.assign(
    Object.assign(req.params, req.body), {
      user: req.user,
    }
  );
  return Promise.resolve().then(() => {
    return deleteSolution(params);
  }).then(result => res.json(result)).catch(next);
}

export async function deleteSolution(params) {
  let {
    solutionId, solution
  } = params;
  
  if (!solution) {
    solution = await models.Solution.findByPrimary(solutionId);
  }
  return solution && solution.destroy();
}