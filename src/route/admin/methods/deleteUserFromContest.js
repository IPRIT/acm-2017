import * as models from "../../../models";
import Promise from 'bluebird';
import * as admin from './index';

export function deleteUserFromContestRequest(req, res, next) {
  let params = Object.assign(
    Object.assign(req.params, req.body), {
      initiatorUser: req.user,
    }
  );
  return Promise.resolve().then(() => {
    return deleteUserFromContest(params);
  }).then(result => res.json(result)).catch(next);
}

export async function deleteUserFromContest(params) {
  let {
    initiatorUser,
    userId, user,
    contestId, contest
  } = params;
  
  if (!user) {
    user = await models.User.findByPrimary(userId);
  }
  if (!contest) {
    contest = await models.Contest.findByPrimary(contestId);
  }
  
  let userIdsBlacklist = [ 1, 2 ];
  if (userIdsBlacklist.includes(Number(userId)) || initiatorUser.id === user.id) {
    throw new HttpError('You have no permissions');
  }
  await admin.deleteSolutionsForUser({ initiatorUser, contest, user, broadcastUpdate: false });
  return contest.removeContestant(user);
}