import * as models from '../../../models';
import Promise from 'bluebird';
import * as contests from './index';
import { makeSourceWatermark, SYNTAX_PYTHON_LITERAL_COMMENT } from '../../../utils';
import deap from 'deap';
import * as sockets from '../../../socket';
import filter from "../../../utils/filter";
import { appendWatermark } from "../../../utils/utils";
import {RatingsStore} from "../../../utils/ratings-store";

export function sendSolutionRequest(req, res, next) {
  return Promise.resolve().then(() => {
    let { contestId } = req.params;
    let user = req.user;
    let params = Object.assign(
      req.body, {
        contestId,
        user,
        ip: req._ip
      }
    );
    return sendSolution(params);
  }).then(result => res.json(result)).catch(next);
}

export async function sendSolution(params) {
  let {
    contestId, contest, symbolIndex,
    languageId, solution,
    userId, user, ip
  } = params;
  
  if (!user) {
    user = await models.User.findByPrimary(userId)
  }
  if (!contest) {
    contest = await models.Contest.findByPrimary(contestId);
  }
  if (!user || !contest) {
    throw new HttpError('User or Contest not found');
  }
  
  let canSend = (
    ![ 'NOT_ENABLED', 'REMOVED', 'FINISHED', 'WAITING' ].includes(contest.status)
    || user.isAdmin
  );
  
  if (!canSend) {
    throw new HttpError('You have no permissions to send solutions when contest is disabled or finished');
  }
  
  let problem = await contests.getProblemBySymbolIndex({ contest, symbolIndex });
  let language = await models.Language.findOne({
    where: { id: languageId }
  });
  
  if (!language) {
    throw new HttpError('Language not found');
  }
  
  if (problem.systemType === 'acmp' && solution.length <= 12) {
    throw new HttpError('ACMP restriction: ' +
      'Solution is too short. Please send solution with more than 12 characters.');
  }
  
  let solutionInstance = await contest.createSolution({
    userId: user.id,
    problemId: problem.id,
    languageId: language.id,
    sourceCode: solution,
    ip,
    nextAttemptWillBeAtMs: Date.now()
  });
  
  if (problem.systemType === 'cf') {
    await appendWatermark(solutionInstance, language);
  }
  
  let filledSolution = await models.Solution.findByPrimary(solutionInstance.id, {
    include: [ models.Problem, models.User, models.Language, models.Contest ]
  });
  let socketData = {
    contestId,
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

  let contestsGroups = await contest.getGroups();
  let ratingsStore = RatingsStore.getInstance();
  if (!ratingsStore.isReady) {
    await ratingsStore.retrieve();
  }

  for (let contestGroup of contestsGroups) {
    let ratingValue = await ratingsStore.getRatingValue(contestGroup.id, solutionInstance.userId);
    if (ratingValue && socketData.solution && socketData.solution.author) {
      socketData.solution.author.rating = ratingValue;
      break;
    }
  }

  let isContestFrozen = contest.isFrozen;
  if (isContestFrozen) {
    Object.assign(socketData, { userId: user.id });
    sockets.emitNewSolutionEvent(socketData, 'user');
  } else {
    sockets.emitNewSolutionEvent(socketData);
  }
  
  return solutionInstance;
}