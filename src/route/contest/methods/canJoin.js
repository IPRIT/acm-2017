import * as models from '../../../models';
import accessGroups from '../../../models/User/userGroups';
import Promise from 'bluebird';
import lodash from 'lodash';

export function canJoinRequest(req, res, next) {
  return Promise.resolve().then(() => {
    return canJoin(
      Object.assign(req.params, { user: req.user })
    );
  }).then(result => res.json(result)).catch(next);
}

export async function canJoin(params) {
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
  
  let contestGroups = await contest.getGroups();
  let userGroups = await user.getGroups();
  
  const isAdmin = accessGroups.utils.hasRight(user.accessGroup, accessGroups.groups.admin.mask);
  
  let joined = await contest.hasContestant(user);
  let can = (
      (
        lodash.intersectionBy(contestGroups, userGroups, 'id').length > 0
        || !contestGroups.length
      )
      && contest.isEnabled
      && !contest.isSuspended
      && (
        ![ 'WAITING', 'FINISHED' ].includes(contest.status)
        || joined
      )
    ) || isAdmin;
  let confirm = !(
    joined || isAdmin
  );
  let result = { can, joined, confirm };
  
  if (!can) {
    const reasons = {
      ACCESS_DENIED: 'ACCESS_DENIED',
      NOT_IN_TIME: 'NOT_IN_TIME'
    };
    let reason = reasons.ACCESS_DENIED;
    if ([ 'WAITING', 'FINISHED' ].includes(contest.status)) {
      reason = reasons.NOT_IN_TIME;
    } else if (!lodash.intersectionBy(contestGroups, userGroups, 'id').length
      || !contest.isEnabled
      || contest.isSuspended) {
      reason = reasons.ACCESS_DENIED;
    }
    Object.assign(result, { reason });
  }
  return result;
}