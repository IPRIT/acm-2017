import * as models from '../../../models';
import Promise from 'bluebird';
import * as contests from './index';
import * as sockets from '../../../socket';

export function joinRequest(req, res, next) {
  return Promise.resolve().then(() => {
    return join(
      Object.assign(req.params, { user: req.user })
    );
  }).then(result => res.json(result)).catch(next);
}

export async function join(params) {
  let {
    contestId, userId, user, contest
  } = params;
  
  if (!user) {
    user = await models.User.findByPrimary(userId)
  }
  if (!contest) {
    contest = await models.Contest.findByPrimary(contestId);
  }
  if (!user || !contest) {
    throw new HttpError('User or Contest not found');
  }
  
  let enterItem = await contest.addContestant(user);
  
  sockets.emitTableUpdateEvent({ contestId });
  
  return {
    result: true,
    previouslyJoined: !enterItem.length
  };
}