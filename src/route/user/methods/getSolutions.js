import { filterEntity as filter } from '../../../utils';
import * as models from "../../../models";
import Promise from 'bluebird';
import deap from "deap";
import userGroups from './../../../models/User/userGroups';
import { RatingsStore } from "../../../utils/ratings-store";
import { extractAllParams } from "../../../utils";
import * as contests from '../../contest/methods/index';
import {getSymbolIndex} from "../../../utils/utils";

export function getSolutionsRequest(req, res, next) {
  return Promise.resolve().then(() => {
    return getSolutions(
      Object.assign(req.query, {
        user: req.user
      })
    );
  }).then(result => res.json(result)).catch(next);
}

export async function getSolutions(params) {
  let {
    userId, user,
    offset, count,
    filterUserIds, filterProblemIds, filterVerdictIds,
    ignoreFreeze, sort = 'DESC',
    withRatings = true
  } = params;

  offset = Number(offset) || 0;
  count = Number(count) || 50;
  withRatings = Number(withRatings);
  filterUserIds = filterUserIds ?
    filterUserIds.split(',').map(Number) : [];
  filterProblemIds = filterProblemIds ?
    filterProblemIds.split(',').map(Number) : [];
  filterVerdictIds = filterVerdictIds ?
    filterVerdictIds.split(',').map(Number) : [];

  if (!user) {
    user = await models.User.findByPrimary(userId);
  }
  if (!user) {
    throw new HttpError('User not found');
  }

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

  if (!user.isAdmin) {
    deap.extend(where, { userId: user.id });
  }

  let ratingsStore = RatingsStore.getInstance();

  return models.Solution.findAll({
    include: [ includeUsers, {
      model: models.Verdict
    }, {
      model: models.Language
    }, {
      model: models.Contest
    }, {
      model: models.Problem,
      required: true,
      attributes: {
        exclude: [ 'htmlStatement', 'textStatement', 'attachments' ]
      }
    }],
    attributes: { exclude: [ 'sourceCode', 'ip' ] },
    order: [ [ 'id', sort ] ],
    limit: count,
    offset,
    where
  }).then(async solutions => {
    if (withRatings) {
      if (!ratingsStore.isReady) {
        await ratingsStore.retrieve();
      }
    }
    return solutions;
  }).map(async solution => {
    let problems = await contests.getProblems({ user, contest: solution.Contest });
    let problemsMapping = new Map();
    problems.forEach((problem, index) => {
      problemsMapping.set(
        problem.id,
        getSymbolIndex( index )
      );
    });

    let rating = 0;
    if (withRatings) {
      try {
        let contestsGroups = await solution.Contest.getGroups();
        let userId = solution.User.id;
        for (let contestGroup of contestsGroups) {
          let ratingValue = await ratingsStore.getRatingValue(contestGroup.id, userId);
          if (ratingValue) {
            rating = ratingValue;
            break;
          }
        }
      } catch (err) {
        console.error(err);
      }
    }

    solution = filter(solution.get({ plain: true }), {
      replace: [
        [ 'User', 'author' ],
        [ 'Verdict', 'verdict' ],
        [ 'Language', 'language' ],
        [ 'Problem', 'problem' ],
        [ 'Contest', 'contest' ]
      ]
    });

    deap.extend(solution.author, { rating });

    let symbolIndex = problemsMapping.get( solution.problemId ) || '';
    return deap.extend(solution, {
      internalSymbolIndex: symbolIndex.toUpperCase()
    });
  }).then(async solutions => {
    return {
      solutions: solutions.sort((a, b) => b.id - a.id),
      solutionsNumber: await models.Solution.count({
        include: [ includeUsers, {
          model: models.Verdict
        }, {
          model: models.Language
        }, {
          model: models.Contest
        }, {
          model: models.Problem,
          required: true,
          attributes: {
            exclude: [ 'htmlStatement', 'textStatement', 'attachments' ]
          }
        }],
        where: deap.extend(where, {
          deletedAt: null
        })
      })
    }
  });
}