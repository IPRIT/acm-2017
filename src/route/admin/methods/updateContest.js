import * as models from "../../../models";
import Promise from 'bluebird';
import userGroups from './../../../models/User/userGroups';
import * as contests from '../../contest/methods';
import { GlobalTablesManager } from "../../../services/table/global-manager";

export function updateContestRequest(req, res, next) {
  let { contestId } = req.params;
  return Promise.resolve().then(() => {
    return updateContest(
      Object.assign(req.body, {
        contestId,
        user: req.user
      })
    );
  }).then(result => res.json(result)).catch(next);
}

export async function updateContest(params) {
  let {
    contest, contestId,
    user, userId,
    startTimeMs, durationTimeMs,
    relativeFreezeTimeMs, practiceDurationTimeMs, name,
    groupIds, problemIds,
    isRated = true
  } = params;
  
  if (!user) {
    user = await models.User.findByPrimary(userId);
  }
  if (!contest) {
    contest = await models.Contest.findByPrimary(contestId);
  }
  if (!user || !contest) {
    throw new HttpError('User or Contest not found');
  }
  
  await contest.update({
    name,
    startTimeMs,
    relativeFreezeTimeMs,
    durationTimeMs,
    practiceDurationTimeMs,
    isRated
  });
  
  await contest.setProblems([]);
  await contest.setProblems(problemIds);
  await contest.setGroups([]);
  await contest.setGroups(groupIds);

  await GlobalTablesManager.getInstance().getTableManager(contest.id).reset();
  
  return contests.getById({ contestId: contest.id });
}