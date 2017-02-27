import * as models from "../../../models";
import Promise from 'bluebird';
import userGroups from './../../../models/User/userGroups';
import * as contests from '../../contest/methods';
import * as sockets from "../../../socket/socket";
import { SYNTAX_PYTHON_LITERAL_COMMENT, makeSourceWatermark } from "../../../utils/utils";

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
    if ([ 'c_cpp', 'csharp', 'java', 'javascript', 'php' ].includes(solution.Language.languageFamily)) {
      await makeSourceWatermark({ solutionInstance: solution });
    } else if ([ 'python' ].includes(solution.Language.languageFamily)) {
      await makeSourceWatermark({ solutionInstance: solution, commentLiteral: SYNTAX_PYTHON_LITERAL_COMMENT });
    }
  }
  
  sockets.emitResetSolutionEvent({
    contestId: solution.contestId,
    solutionId: solution.id
  });
  
  return solution;
}