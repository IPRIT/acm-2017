import { filterEntity as filter } from '../../../utils';
import * as models from "../../../models";
import Promise from 'bluebird';
import deap from "deap";
import { extractAllParams } from "../../../utils";

export function getRatingHistoryRequest(req, res, next) {
  return Promise.resolve().then(() => {
    return getRatingHistory(
      Object.assign(req.query, {
        initiatorUser: req.user
      })
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
  
  let targetVersion = await models.RatingChange.getCurrentVersion();
  
  let ratingChanges = await user.getRatingChanges({
    where: {
      groupId,
      versionNumber: targetVersion
    },
    order: 'Contest.startTimeMs ASC',
    include: [{
      model: models.Contest
    }, models.Group]
  });
  ratingChanges = ratingChanges.map(ratingChange => {
    return filter(ratingChange.get({ plain: true}), {
      replace: [
        [ 'Contest', 'contest' ],
        [ 'Group', 'group' ],
      ]
    });
  });
  let currentRating = ratingChanges[ratingChanges.length - 1];
  
  let otherUsers = await models.RatingChange.findAll({
    where: {
      groupId,
      versionNumber: targetVersion,
    },
    order: 'RatingChange.ratingAfter DESC',
    include: [{
      model: models.Contest
    }, models.Group, models.User]
  });
  
  let otherUsersMap = new Map();
  for (let ratingChange of otherUsers) {
    if (!otherUsersMap.has(ratingChange.userId)) {
      otherUsersMap.set(ratingChange.userId, []);
    }
    let userChanges = otherUsersMap.get(ratingChange.userId);
    userChanges.push( ratingChange );
  }
  
  let latestUsersChanges = [];
  otherUsersMap.forEach(usersArray => {
    let latestContestIndex = 0, latestContestStartTimeMs = -1e9;
    usersArray.forEach((change, index) => {
      if (latestContestStartTimeMs < change.Contest.startTimeMs) {
        latestContestStartTimeMs = change.Contest.startTimeMs;
        latestContestIndex = index;
      }
    });
    latestUsersChanges.push( usersArray[latestContestIndex] );
  });
  latestUsersChanges.sort((a, b) => b.ratingAfter - a.ratingAfter);
  
  currentRating.groupRank = latestUsersChanges.findIndex(change => {
    return change && currentRating && change.userId === currentRating.userId;
  }) + 1;
  
  return {
    currentRating, ratingChanges
  };
}