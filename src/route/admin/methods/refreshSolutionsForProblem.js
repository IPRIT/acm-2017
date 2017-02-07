import * as models from "../../../models";
import Promise from 'bluebird';
import userGroups from './../../../models/User/userGroups';
import * as contests from '../../contest/methods';
import * as admin from '../../admin/methods';

export function refreshSolutionsForProblemRequest(req, res, next) {
  let params = Object.assign(
    Object.assign(req.params, req.body), {
      user: req.user,
    }
  );
  return Promise.resolve().then(() => {
    return refreshSolutionsForProblem(params);
  }).then(result => res.json(result)).catch(next);
}

export async function refreshSolutionsForProblem(params) {
  let {
    contestId, contest,
    symbolIndex
  } = params;
  
  if (!contest) {
    contest = await models.Contest.findByPrimary(contestId);
  }
  let problem = await contests.getProblemBySymbolIndex({ contest, symbolIndex });
  
  await contest.getSolutions({
    where: {
      problemId: problem.id
    },
    order: [ [ 'id', 'DESC' ] ]
  }).filter(solution => solution.verdictId !== 12).map(solution => {
    console.log(`Refreshing: ${solution.id}`);
    return admin.refreshSolution({ solution });
  }, { concurrency: 5 });
  
  return { result: true }
}