import * as models from "../../../models";
import Promise from 'bluebird';

export function getRatingTableRequest(req, res, next) {
  return Promise.resolve().then(() => {
    return getRatingTable(
      Object.assign(req.query), {
        initiatorUser: req.user
      }
    );
  }).then(result => res.json(result)).catch(next);
}

export async function getRatingTable(params) {
  let {
    groupId, group
  } = params;
  
  if (!group) {
    group = await models.Group.findByPrimary(groupId);
    if (!group) {
      throw new HttpError('Group not found');
    }
  }
  
  let targetVersion = await models.RatingChange.getCurrentVersion();
  
  let otherUsers = await models.RatingChange.findAll({
    where: {
      groupId: group.id,
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
  latestUsersChanges = latestUsersChanges.map((value, index) => {
    value = value.get({ plain: true }) || value;
    value.groupRank = index + 1;
    value.User.rating = value.ratingAfter;
    return value;
  });
  
  return latestUsersChanges;
}