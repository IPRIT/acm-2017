import * as models from "../../../models";
import Promise from 'bluebird';
import userGroups from './../../../models/User/userGroups';
import * as contests from '../../contest/methods';

export function createContestRequest(req, res, next) {
  return Promise.resolve().then(() => {
    return createContest(
      Object.assign(req.body, {
        user: req.user
      })
    );
  }).then(result => res.json(result)).catch(next);
}

export async function createContest(params) {
  let {
    user, userId,
    startTimeMs, durationTimeMs,
    relativeFreezeTimeMs, practiceDurationTimeMs, name,
    groupIds, problemIds,
    isRated = true
  } = params;
  
  if (!user) {
    user = await models.User.findByPrimary(userId);
  }
  let contest = await models.Contest.create({
    authorId: user.id,
    name,
    startTimeMs,
    relativeFreezeTimeMs,
    durationTimeMs,
    practiceDurationTimeMs,
    isRated
  });
  
  await contest.addProblems(problemIds);
  await contest.addGroups(groupIds);
  
  return contests.getById({ contestId: contest.id });
}