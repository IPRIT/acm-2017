import * as models from "../../../models";
import Promise from 'bluebird';
import * as sockets from '../../../socket';
import { GlobalTablesManager } from "../../../services/table/global-manager";

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
    solutionId, solution,
    broadcastUpdate = true
  } = params;
  
  if (!solution) {
    solution = await models.Solution.findByPrimary(solutionId);
    if (!solution) {
      throw new HttpError('Solution not found');
    }
  }
  
  let contest = await solution.getContest();
  let result = await solution.destroy();

  await GlobalTablesManager.getInstance().getTableManager(contest.id).removeSolution( result );

  let isContestFrozen = contest.isFrozen;
  if (!isContestFrozen && broadcastUpdate) {
    sockets.emitTableUpdateEvent({
      contestId: contest.id
    });
  }
  return result;
}