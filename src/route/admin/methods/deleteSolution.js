import * as models from "../../../models";
import Promise from 'bluebird';
import * as sockets from '../../../socket';

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
    if (!solution) {
      throw new HttpError('Solution not found');
    }
  }
  
  let contest = await solution.getContest();
  let result = await solution.destroy();
  
  let isContestFrozen = contest.isFrozen;
  if (!isContestFrozen) {
    sockets.emitTableUpdateEvent({
      contestId: contest.id
    });
  }
  return result;
}