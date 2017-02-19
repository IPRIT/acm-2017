import * as models from "../../../models";
import Promise from 'bluebird';
import userGroups from './../../../models/User/userGroups';
import * as contests from '../../contest/methods';
import { makeSourceWatermark, SYNTAX_PYTHON_LITERAL_COMMENT } from "../../../utils/utils";
import * as sockets from '../../../socket';
import filter from "../../../utils/filter";
import { getSymbolIndex } from "../../../utils/utils";
import * as deap from "deap/lib/deap";

export function duplicateSolutionRequest(req, res, next) {
  let params = Object.assign(
    Object.assign(req.params, req.body), {
      initiatorUser: req.user,
    }
  );
  return Promise.resolve().then(() => {
    return duplicateSolution(params);
  }).then(result => res.json(result)).catch(next);
}

export async function duplicateSolution(params) {
  let {
    solutionId, asAdmin = false,
    initiatorUser
  } = params;
  
  let solution = await models.Solution.findByPrimary(solutionId, {
    include: [ models.Problem, models.User, models.Language, models.Contest ]
  });
  let { Problem, Contest, Language, User } = solution;
  
  let newSolution = await Contest.createSolution({
    userId: asAdmin ? 2 : solution.userId,
    problemId: Problem.id,
    languageId: Language.id,
    sourceCode: solution.sourceCode,
    ip: solution.ip,
    duplicatedFromId: solution.id,
    nextAttemptWillBeAtMs: Date.now()
  });
  
  if (Problem.systemType === 'cf') {
    if ([ 'c', 'csharp', 'java', 'javascript', 'php' ].includes(Language.languageFamily)) {
      await makeSourceWatermark({ solutionInstance: newSolution });
    } else if ([ 'python' ].includes(Language.languageFamily)) {
      await makeSourceWatermark({ solutionInstance: newSolution, commentLiteral: SYNTAX_PYTHON_LITERAL_COMMENT });
    }
  }
  
  let filledSolution = await models.Solution.findByPrimary(newSolution.id, {
    include: [ models.Problem, models.User, models.Language, models.Contest ]
  });
  let problems = await contests.getProblems({ user: filledSolution.User, contest: filledSolution.Contest });
  let foundProblemIndex = problems.findIndex(problem => problem.id === Problem.id);
  let symbolIndex = getSymbolIndex(foundProblemIndex).toUpperCase();
  let socketData = {
    contestId: filledSolution.contestId,
    solution: deap.extend(filter(filledSolution.get({ plain: true }), {
      replace: [
        [ 'User', 'author' ],
        [ 'Contest', 'contest' ],
        [ 'Problem', 'problem' ],
        [ 'Language', 'language' ],
      ],
      exclude: [ 'sourceCode' ]
    }), { internalSymbolIndex: symbolIndex })
  };
  let isContestFrozen = Contest.isFrozen;
  if (isContestFrozen) {
    Object.assign(socketData, { userId: initiatorUser.id });
    sockets.emitNewSolutionEvent(socketData, 'user');
  } else {
    sockets.emitNewSolutionEvent(socketData);
  }
  
  return newSolution;
}