import { filterEntity as filter, getSymbolIndex } from '../../../utils';
import * as models from "../../../models";
import Promise from 'bluebird';
import * as contests from './index';
import deap from 'deap';
import userGroups from './../../../models/User/userGroups';
import { RatingsStore } from "../../../utils/ratings-store";

export function getSolutionsRequest(req, res, next) {
  return Promise.resolve().then(() => {
    let {
      offset = 0, count = 50,
      filterUserIds, filterProblemIds, filterVerdictIds
    } = req.query;
    return getSolutions(
      Object.assign(req.params, {
        user: req.user,
        offset, count,
        filterUserIds, filterProblemIds, filterVerdictIds
      })
    );
  }).then(result => res.json(result)).catch(next);
}

export async function getSolutions(params) {
  let {
    contestId, contest,
    userId, user,
    offset, count,
    solutionsType,
    filterUserIds, filterProblemIds, filterVerdictIds,
    ignoreFreeze, sort = 'DESC',
    withRatings = true
  } = params;
  
  offset = Number(offset) || 0;
  count = Number(count) || 50;
  filterUserIds = filterUserIds ?
    filterUserIds.split(',').map(Number) : [];
  filterProblemIds = filterProblemIds ?
    filterProblemIds.split(',').map(Number) : [];
  filterVerdictIds = filterVerdictIds ?
    filterVerdictIds.split(',').map(Number) : [];

  if (!user) {
    user = await models.User.findByPrimary(userId);
  }
  if (!contest) {
    contest = await models.Contest.findByPrimary(contestId);
  }
  if (!user || !contest) {
    throw new HttpError('User or Contest not found');
  }
  
  let problems = await contests.getProblems({ user, contest });
  let problemsMapping = new Map();
  problems.forEach((problem, index) => {
    problemsMapping.set(
      problem.id,
      getSymbolIndex( index )
    );
  });
  
  let currentTimeMs = new Date().getTime(),
    isContestFrozen = currentTimeMs >= contest.absoluteFreezeTimeMs && currentTimeMs <= contest.absoluteDurationTimeMs;
  
  let where = {};
  if (filterUserIds.length) {
    Object.assign(where, {
      userId: {
        $in: filterUserIds
      }
    });
  }
  if (filterProblemIds.length) {
    Object.assign(where, {
      problemId: {
        $in: filterProblemIds
      }
    });
  }
  if (filterVerdictIds.length) {
    Object.assign(where, {
      verdictId: {
        $in: filterVerdictIds
      }
    });
  }
  let includeUsers = {
    model: models.User,
    required: true,
    attributes: { exclude: [ 'password' ] }
  };
  
  if (solutionsType === 'my') {
    deap.extend(where, { userId: user.id });
  }
  if (!user.isAdmin) {
    deap.extend(includeUsers, {
      where: {
        accessGroup:  {
          $ne: userGroups.groups.admin.mask
        }
      }
    });
    if (isContestFrozen && !ignoreFreeze) {
      deap.extend(where, {
        $or: {
          sentAtMs: {
            $or: { // (gt, lt)
              $gt: contest.absoluteDurationTimeMs,
              $lt: contest.absoluteFreezeTimeMs
            }
          },
          userId: user.id
        }
      });
    }
  }
  
  return contest.getSolutions({
    include: [ includeUsers, {
      model: models.Verdict
    }, {
      model: models.Language
    }, {
      model: models.Contest,
      attributes: [ 'startTimeMs', 'durationTimeMs' ]
    }, {
      model: models.Problem,
      required: true,
      where: {
        id: {
          $in: [ ...problemsMapping.keys() ]
        }
      },
      attributes: {
        exclude: [ 'htmlStatement', 'textStatement', 'attachments' ]
      }
    }],
    attributes: { exclude: [ 'sourceCode', 'ip' ] },
    order: [ [ 'id', sort ] ],
    limit: count,
    offset,
    where
  }).map(solution => {
    solution = filter(solution.get({ plain: true }), {
      replace: [
        [ 'User', 'author' ],
        [ 'Verdict', 'verdict' ],
        [ 'Language', 'language' ],
        [ 'Problem', 'problem' ],
        [ 'Contest', 'contest' ]
      ]
    });
    let symbolIndex = problemsMapping.get( solution.problemId ) || '';
    return deap.extend(solution, {
      internalSymbolIndex: symbolIndex.toUpperCase()
    });
  }).then(async solutions => {
    if (!withRatings) {
      return solutions;
    }
    try {
      let contestsGroups = await contest.getGroups();
      let ratingsStore = RatingsStore.getInstance();
      if (!ratingsStore.isReady) {
        await ratingsStore.retrieve();
      }

      for (let solution of solutions) {
        let userId = solution.author.id;
        for (let contestGroup of contestsGroups) {
          let ratingValue = await ratingsStore.getRatingValue(contestGroup.id, userId);
          if (ratingValue) {
            solution.author.rating = ratingValue;
            break;
          }
        }
      }
      return solutions;
    } catch (err) {
      return solutions;
    }
  }).then(async solutions => {
    return {
      solutions,
      solutionsNumber: await models.Solution.count({
        include: [ includeUsers, {
          model: models.Problem,
          required: true,
          where: {
            id: {
              $in: [ ...problemsMapping.keys() ]
            }
          },
          attributes: {
            exclude: [ 'htmlStatement', 'textStatement', 'attachments' ]
          }
        } ],
        where: deap.extend(where, { contestId: contest.id })
      })
    }
  });
}