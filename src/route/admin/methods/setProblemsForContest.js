import * as models from "../../../models";
import Promise from 'bluebird';
import userGroups from './../../../models/User/userGroups';
import * as contests from '../../contest/methods';
import { GlobalTablesManager } from "../../../services/table/global-manager";

export function setProblemsForContestRequest(req, res, next) {
  let { contestId } = req.params;
  return Promise.resolve().then(() => {
    return setProblemsForContest(
      Object.assign(req.body, {
        contestId,
        user: req.user
      })
    );
  }).then(result => res.json(result)).catch(next);
}

export async function setProblemsForContest(params) {
  let {
    contest, contestId,
    user, userId,
    problemIds
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
  
  await contest.setProblems([]);
  let result = await contest.setProblems(problemIds);

  await GlobalTablesManager.getInstance().getTableManager(contest.id).reset();

  return result;
}