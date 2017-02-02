import { filterEntity as filter, getSymbolIndex } from '../../../utils';
import * as models from "../../../models";
import Promise from 'bluebird';
import * as contests from './index';
import deap from 'deap';
import userGroups from './../../../models/User/userGroups';
import Sequelize from 'sequelize';

export function getSolutionsForCellRequest(req, res, next) {
  return Promise.resolve().then(() => {
    let { offset = 0, count = 50 } = req.query;
    return getSolutionsForCell(
      Object.assign(req.params, {
        user: req.user,
        offset, count
      })
    );
  }).then(result => res.json(result)).catch(next);
}

export async function getSolutionsForCell(params) {
  let {
    contestId, contest,
    userId, user,
    offset, count,
    contestantId, problemSymbol,
    ignoreFreeze, sort = 'DESC'
  } = params;
  
  offset = Number(offset) || 0;
  count = Number(count) || 1e9;
  
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
  let problemsMapping = new Map(),
    backProblemsMapping = new Map();
  problems.forEach((problem, index) => {
    problemsMapping.set(
      problem.id,
      getSymbolIndex( index )
    );
    backProblemsMapping.set(
      getSymbolIndex( index ),
      problem.id
    );
  });
  
  let currentTimeMs = new Date().getTime(),
    isContestFrozen = currentTimeMs >= contest.absoluteFreezeTimeMs && currentTimeMs <= contest.absoluteDurationTimeMs;
  
  let where = {
    problemId: backProblemsMapping.get( problemSymbol.toLowerCase() ),
    userId: contestantId
  };
  let includeUsers = {
    model: models.User,
    required: true,
    attributes: { exclude: [ 'password' ] }
  };
  
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
      model: models.Problem,
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
        [ 'Problem', 'problem' ]
      ]
    });
    return deap.extend(solution, {
      internalSymbolIndex: problemsMapping.get( solution.problemId ).toUpperCase()
    });
  }).then(async solutions => {
    return {
      solutions,
      solutionsNumber: await models.Solution.count({
        include: [ includeUsers ],
        where: deap.extend(where, { contestId: contest.id })
      })
    }
  });
}