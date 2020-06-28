import * as models from "../../../models";
import Promise from 'bluebird';
import userGroups from './../../../models/User/userGroups';

export function getRatingTableRequest(req, res, next) {
  return Promise.resolve().then(() => {
    return getRatingTable(req.body);
  }).then(result => res.json(result)).catch(next);
}

export async function getRatingTable(params) {
  let {
    contestIds, scoreInTime, scoreInPractice
  } = params;
  
  let solutions = await models.Solution.findAll({
    attributes: {
      exclude: [ 'sourceCode' ]
    },
    where: {
      contestId: {
        $in: contestIds
      },
      verdictId: 1
    },
    group: [ 'problemId', 'userId' ],
    order: [
      [ 'userId', 'ASC' ],
      [ 'problemId', 'ASC' ]
    ],
    include: [{
      model: models.User,
      required: true,
      attributes: { exclude: [ 'password' ] },
      where: {
        accessGroup:  {
          $notIn: [
            userGroups.groups.admin.mask,
            userGroups.groups.moderator.mask,
          ]
        }
      }
    }, models.Contest]
  });
  
  let contestsMap = new Map();
  for (let currentSolution of solutions) {
    let currentContest = currentSolution.Contest.get({ plain: true });
    if (!contestsMap.has( currentContest.id )) {
      contestsMap.set(currentContest.id, {
        users: new Map(),
        info: currentContest
      });
    }
    let currentUsersMap = contestsMap.get( currentContest.id ).users;
    let currentUser = currentSolution.User.get({ plain: true });
    if (!currentUsersMap.has( currentUser.id )) {
      currentUsersMap.set(currentUser.id, {
        accepts: [ ],
        info: currentUser
      });
    }
    let currentUserObject = currentUsersMap.get( currentUser.id );
    currentUserObject.accepts.push({
      solutionId: currentSolution.id,
      acceptTime: currentSolution.sentAtMs,
      problemId: currentSolution.problemId
    });
  }
  
  function divideSolutionsNumbers(contestInfo, acceptedArray = []) {
    let wasSentInBasicTime = (time) => time >= contestInfo.startTimeMs && time <= contestInfo.absoluteDurationTimeMs;
    let acceptsInBasicTime = acceptedArray.filter(acceptedItem => wasSentInBasicTime(acceptedItem.acceptTime));
    return [ acceptsInBasicTime.length, acceptedArray.length - acceptsInBasicTime.length ];
  }
  
  var tempTable = {
    header: {
      row: [ ]
    },
    users: new Map()
  };
  contestsMap.forEach((contest, contestId) => {
    tempTable.header.row.push( contest.info );
    let contestants = contest.users;
    contestants.forEach((contestant, contestantId) => {
      let currentUser = contestant.info;
      if (!tempTable.users.has( currentUser.id )) {
        tempTable.users.set(currentUser.id, {
          info: currentUser,
          contests: new Map(),
          row: [ ]
        });
      }
      let currentUserObject = tempTable.users.get( currentUser.id );
      currentUserObject.contests.set(contestId, divideSolutionsNumbers(contest.info, contestant.accepts));
    });
  });
  
  tempTable.users.forEach((user, userId) => {
    let allContests = tempTable.header.row;
    for (let contest of allContests) {
      let userContestResult = user.contests.get( contest.id ) || [ 0, 0 ];
      user.row.push( userContestResult );
    }
  });
  
  let readyTable = {
    header: tempTable.header,
    rows: [ ]
  };
  tempTable.users.forEach((user, userId) => {
    readyTable.rows.push({
      user: user.info,
      row: user.row,
      scoreInTime: user.row.reduce((prev, cur) => prev + cur[0] * scoreInTime, 0),
      scoreInPractice: user.row.reduce((prev, cur) => prev + cur[1] * scoreInPractice, 0),
      scoreSum: user.row.reduce((prev, cur) => prev + cur[0] * scoreInTime + cur[1] * scoreInPractice, 0)
    });
  });

  readyTable.rows.sort((x, y) => {
    if (x.scoreSum === y.scoreSum) {
      return (x.scoreInTime === y.scoreInTime) ? 0 : (
        (x.scoreInTime > y.scoreInTime) ? -1 : 1
      );
    }
    return (x.scoreSum > y.scoreSum) ? -1 : 1;
  });
  
  return readyTable;
}