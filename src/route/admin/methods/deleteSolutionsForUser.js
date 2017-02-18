import * as models from "../../../models";
import Promise from 'bluebird';
import * as sockets from '../../../socket';
import * as admin from './index';

export function deleteSolutionsForUserRequest(req, res, next) {
  let params = Object.assign(
    Object.assign(req.params, req.body), {
      initiatorUser: req.user,
    }
  );
  return Promise.resolve().then(() => {
    return deleteSolutionsForUser(params);
  }).then(result => res.json(result)).catch(next);
}

export async function deleteSolutionsForUser(params) {
  let {
    initiatorUser,
    contestId, contest,
    userId, user,
    broadcastUpdate = true
  } = params;
  
  if (!contest) {
    contest = await models.Contest.findByPrimary(contestId);
    if (!contest) {
      throw new HttpError('Contest not found');
    }
  }
  if (!user) {
    user = await models.User.findByPrimary(userId);
    if (!user) {
      throw new HttpError('User not found');
    }
  }
  
  return contest.getSolutions({
    where: {
      userId: user.id
    }
  }).map(solution => {
    return admin.deleteSolution({ solution, broadcastUpdate: false });
  }, { concurrency: 5 }).then(() => {
    let isContestFrozen = contest.isFrozen;
    if (!isContestFrozen && broadcastUpdate) {
      sockets.emitTableUpdateEvent({
        contestId: contest.id
      });
    }
  });
}