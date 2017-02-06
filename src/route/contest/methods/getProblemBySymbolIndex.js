import { filterEntity as filter, getSymbolIndex, getIntegerIndex } from '../../../utils';
import * as models from "../../../models";
import Promise from 'bluebird';

export function getProblemBySymbolIndexRequest(req, res, next) {
  return Promise.resolve().then(() => {
    return getProblemBySymbolIndex(req.params);
  }).then(result => res.json(result)).catch(next);
}

export async function getProblemBySymbolIndex(params) {
  let {
    contestId, contest, symbolIndex
  } = params;
  if (!contest) {
    contest = await models.Contest.findByPrimary(contestId);
  }
  if (!contest) {
    throw new HttpError('Contest not found');
  }
  return contest.getProblems({
    include: [{
      model: models.ProblemToContest,
      where: {
        contestId: contest.id
      }
    }],
    order: [
      [ models.ProblemToContest, 'id', 'ASC']
    ],
    offset: getIntegerIndex(symbolIndex),
    limit: 1
  }).map((problem, index) => {
    problem = Object.assign(problem.get({ plain: true }), {
      internalSymbolIndex: symbolIndex.toUpperCase()
    });
    return filter(problem, {
      exclude: [
        'ProblemToContest', 'ProblemToContests', 'textStatement'
      ]
    })
  }).then(problemsArray => {
    if (!problemsArray.length) {
      throw new HttpError('Problem not found');
    }
    return problemsArray[0];
  });
}