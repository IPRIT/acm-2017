import { filterEntity as filter, getSymbolIndex } from '../../../utils';
import * as models from "../../../models";
import Promise from 'bluebird';
import userGroups from "../../../models/User/userGroups";

export function getParticipantsRequest(req, res, next) {
  return Promise.resolve().then(() => {
    return getParticipants(
      Object.assign(req.params, { user: req.user })
    );
  }).then(result => res.json(result)).catch(next);
}

export async function getParticipants(params) {
  let {
    contestId, contest,
    userId, user
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
  return contest.getContestants({
    where: {
      accessGroup: {
        $ne: userGroups.groups.admin.mask
      }
    }
  });
}