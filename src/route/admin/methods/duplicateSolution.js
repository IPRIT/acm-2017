import * as models from "../../../models";
import Promise from 'bluebird';
import * as contests from '../../contest/methods';
import * as sockets from '../../../socket';
import { getSymbolIndex, appendWatermark, filterEntity as filter } from "../../../utils";
import deap from 'deap';
import { RatingsStore } from "../../../utils/ratings-store";

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
    userId: asAdmin ? (initiatorUser.isAdmin ? 2 : initiatorUser.id) : solution.userId,
    problemId: Problem.id,
    languageId: Language.id,
    sourceCode: solution.sourceCode,
    ip: solution.ip,
    duplicatedFromId: solution.id,
    nextAttemptWillBeAtMs: Date.now()
  });
  
  if (Problem.systemType === 'cf') {
    await appendWatermark(newSolution, Language);
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

  let contestsGroups = await Contest.getGroups();
  let ratingsStore = RatingsStore.getInstance();
  if (!ratingsStore.isReady) {
    await ratingsStore.retrieve();
  }

  for (let contestGroup of contestsGroups) {
    let ratingValue = await ratingsStore.getRatingValue(contestGroup.id, newSolution.userId);
    if (ratingValue && socketData.solution && socketData.solution.author) {
      socketData.solution.author.rating = ratingValue;
      break;
    }
  }

  let isContestFrozen = Contest.isFrozen;
  if (isContestFrozen) {
    Object.assign(socketData, { userId: initiatorUser.id });
    sockets.emitNewSolutionEvent(socketData, 'user');
  } else {
    sockets.emitNewSolutionEvent(socketData);
  }
  if (!User.isSupervisor) {
    sockets.emitUserSolutionsEvent(newSolution.userId, 'new solution', socketData.solution);
  }
  sockets.emitAdminSolutionsEvent('new solution', socketData.solution);
  
  return newSolution;
}