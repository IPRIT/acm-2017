import * as models from "../../../models";
import Promise from 'bluebird';
import userGroups from './../../../models/User/userGroups';
import * as contests from '../../contest/methods';
import * as sockets from '../../../socket';

export function setVerdictRequest(req, res, next) {
  let params = Object.assign(
    Object.assign(req.params, req.body), {
      user: req.user,
    }
  );
  return Promise.resolve().then(() => {
    return setVerdict(params);
  }).then(result => res.json(result)).catch(next);
}

export async function setVerdict(params) {
  let {
    solutionId, verdictId
  } = params;
  
  let solution = await models.Solution.findByPrimary(solutionId);
  await solution.update({
    verdictId
  });
  
  let contest = await solution.getContest();
  let isContestFrozen = contest.isFrozen;
  if (!isContestFrozen) {
    sockets.emitTableUpdateEvent({
      contestId: contest.id
    });
  }
  
  return solution;
}