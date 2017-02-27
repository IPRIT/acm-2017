import * as models from "../../../models";
import Promise from 'bluebird';
import userGroups from './../../../models/User/userGroups';
import * as contests from '../../contest/methods';
import * as admin from '../../admin/methods';
import * as sockets from "../../../socket";

export function refreshSolutionsRequest(req, res, next) {
  let params = Object.assign(
    Object.assign(req.params, req.body), {
      user: req.user,
    }
  );
  return Promise.resolve().then(() => {
    return refreshSolutions(params);
  }).then(result => res.json(result)).catch(next);
}

export async function refreshSolutions(params) {
  let {
    contestId, contest
  } = params;
  
  if (!contest) {
    contest = await models.Contest.findByPrimary(contestId);
  }
  
  await contest.getSolutions({
    include: [{
      model: models.Problem,
      attributes: {
        exclude: [ 'htmlStatement', 'textStatement' ]
      }
    }, {
      model: models.Language
    }]
  }).filter(solution => {
    return solution.verdictId !== 12;
  }).map(solution => {
    console.log(`Refreshing: ${solution.id}`);
    return admin.refreshSolution({ solution });
  }, { concurrency: 5 }).then(() => {
    sockets.emitTableUpdateEvent({
      contestId: contest.id
    });
  });
  
  return { result: true }
}