import { filterEntity as filter } from '../../../utils';
import * as models from "../../../models";
import Promise from 'bluebird';
import deap from "deap";
import { extractAllParams } from "../../../utils";

export function getRatingHistoryRequest(req, res, next) {
  return Promise.resolve().then(() => {
    return getRatingHistory(
      Object.assign(req.query), {
        initiatorUser: req.user
      }
    );
  }).then(result => res.json(result)).catch(next);
}

export async function getRatingHistory(params) {
  let {
    userId, user,
    groupId, group,
    initiatorUser
  } = params;
  
  if (!user) {
    user = await models.User.findByPrimary(userId);
  }
  if (!group) {
    group = await models.Group.findByPrimary(groupId);
  }
  if (!user || !group) {
    throw new HttpError('User or Group not found');
  }
  
  let ratingChanges = await user.getRatingChanges({
    where: {
      groupId
    },
    order: 'contestId ASC',
    include: [{
      model: models.Contest
    }]
  });
  
  return ratingChanges.map(ratingChange => {
    return filter(ratingChange.get({ plain: true}), {
      replace: [
        [ 'Contest', 'contest' ]
      ]
    });
  });
}