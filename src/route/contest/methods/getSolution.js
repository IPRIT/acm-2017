import { filterEntity as filter, getSymbolIndex } from '../../../utils';
import * as models from "../../../models";
import Promise from 'bluebird';
import deap from 'deap';
import * as contests from '../../contest/methods';

export function getSolutionRequest(req, res, next) {
  let { raw } = req.query;
  return Promise.resolve().then(() => {
    return getSolution(
      Object.assign(req.params, {
        user: req.user, raw
      })
    );
  }).then(result => raw ? res.end(result) : res.json(result))
    .catch(next);
}

export async function getSolution(params) {
  let {
    contestId,
    userId, user,
    solutionId, raw
  } = params;
  
  if (!user) {
    user = await models.User.findByPrimary(userId);
  }
  
  let solution = await models.Solution.findByPrimary(solutionId, {
    include: [ {
      model: models.User,
      attributes: { exclude: [ 'password' ] }
    }, {
      model: models.Verdict
    }, {
      model: models.Language
    }, {
      model: models.Contest
    }, {
      model: models.Problem,
      attributes: {
        exclude: [ 'htmlStatement', 'textStatement', 'attachments' ]
      }
    }],
  });
  if (!solution || Number(contestId) !== solution.contestId) {
    throw new HttpError('Solution not found');
  }
  
  let problems = await contests.getProblems({ user, contest: solution.Contest });
  let foundProblemIndex = problems.findIndex(problem => problem.id === solution.problemId);
  let symbolIndex = getSymbolIndex(foundProblemIndex).toUpperCase();
  
  let canSee = solution.userId === user.id || user.isAdmin;
  if (!canSee) {
    throw new HttpError('You have no permissions', 403);
  } else if (raw) {
    return solution.sourceCode;
  }
  return deap.extend(filter(solution.get({ plain: true }), {
    replace: [
      [ 'User', 'author' ],
      [ 'Verdict', 'verdict' ],
      [ 'Language', 'language' ],
      [ 'Problem', 'problem' ],
      [ 'Contest', 'contest' ],
    ]
  }), { internalSymbolIndex: symbolIndex });
}