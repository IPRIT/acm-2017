import * as models from "../../../models";
import Promise from 'bluebird';
import userGroups from './../../../models/User/userGroups';
import * as contests from '../../contest/methods';
import * as admin from '../../admin/methods';
import * as sockets from "../../../socket";

export function refreshSolutionsForProblemAndUserRequest(req, res, next) {
  return Promise.resolve().then(() => {
    return refreshSolutionsForProblemAndUser(req.params);
  }).then(result => res.json(result)).catch(next);
}

export async function refreshSolutionsForProblemAndUser(params) {
  let {
    contestId, contest,
    userId, user,
    symbolIndex
  } = params;
  
  if (!contest) {
    contest = await models.Contest.findByPrimary(contestId);
  }
  if (!user) {
    user = await models.User.findByPrimary(userId);
  }
  
  let where = {
    userId: user.id
  };
  
  if (symbolIndex !== 'all') {
    let problem = await contests.getProblemBySymbolIndex({ contest, symbolIndex });
    Object.assign(where, {
      problemId: problem.id
    });
  }
  
  await contest.getSolutions({
    include: [{
      model: models.Problem,
      attributes: {
        exclude: [ 'htmlStatement', 'textStatement' ]
      }
    }, {
      model: models.Language
    }],
    where,
    order: [ [ 'id', 'DESC' ] ]
  }).filter(solution => solution.verdictId !== 12).map(solution => {
    console.log(`Refreshing: ${solution.id}`);
    return admin.refreshSolution({ solution });
  }, { concurrency: 5 }).then(() => {
    sockets.emitTableUpdateEvent({
      contestId: contest.id
    });
  });
  
  return { result: true }
}