import * as models from "../../../models";
import Promise from 'bluebird';
import * as sockets from "../../../socket/socket";
import { appendWatermark } from "../../../utils/utils";
import { GlobalTablesManager } from "../../../services/table/global-manager";

export function refreshSolutionRequest(req, res, next) {
  let params = Object.assign(
    Object.assign(req.params, req.body), {
      user: req.user,
    }
  );
  return Promise.resolve().then(() => {
    return refreshSolution(params);
  }).then(result => res.json(result)).catch(next);
}

export async function refreshSolution(params) {
  let {
    solutionId, solution
  } = params;
  
  if (!solution) {
    solution = await models.Solution.findByPrimary(solutionId, {
      include: [{
        model: models.Problem,
        attributes: {
          exclude: [ 'htmlStatement', 'textStatement' ]
        }
      }, {
        model: models.Language
      }]
    });
  }

  if (!solution || !solution.Problem) {
    return solution;
  }
  
  await solution.update({
    nextAttemptWillBeAtMs: Date.now(),
    verdictId: null,
    memory: 0,
    executionTime: 0,
    testNumber: 0,
    retriesNumber: 0,
    verdictGotAtMs: null,
    refreshedNumber: solution.refreshedNumber + 1,
    errorTrace: null,
    compilationError: null
  });
  
  if (solution.Problem.systemType === 'cf') {
    await appendWatermark(solution);
  }

  await GlobalTablesManager.getInstance().getTableManager(solution.contestId).removeSolution( solution );
  
  sockets.emitResetSolutionEvent({
    contestId: solution.contestId,
    solutionId: solution.id
  });
  sockets.emitUserSolutionsEvent(solution.userId, 'reset solution', {
    solutionId: solution.id
  });
  sockets.emitAdminSolutionsEvent('reset solution', {
    solutionId: solution.id
  });
  
  return solution;
}