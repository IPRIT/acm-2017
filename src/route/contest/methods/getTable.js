import { filterEntity as filter, getSymbolIndex } from '../../../utils';
import * as models from "../../../models";
import Promise from 'bluebird';
import * as contests from './index';
import * as usersMethods from '../../user/methods';
import * as lodash from "lodash";

const PENALTY_TIME = 20; // minutes

export function getTableRequest(req, res, next) {
  return Promise.resolve().then(() => {
    return getTable(
      Object.assign(req.params, {
        user: req.user
      })
    );
  }).then(result => res.json(result)).catch(next);
}

export async function getTable(params) {
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
  let problems = await contests.getProblems({ user, contest });
  
  let wasSentInFreezeTime = time => time >= contest.absoluteFreezeTimeMs && time <= contest.absoluteDurationTimeMs,
    wasSentInBasicTime = time => time >= contest.startTimeMs && time <= contest.absoluteDurationTimeMs,
    currentTimeMs = new Date().getTime();
  
  let indexMapping = new Map(),
    backIndexMapping = new Map(),
    index = 0;
  for (let problem of problems) {
    let { id } = problem;
    let symbolIndex = getSymbolIndex( index ).toUpperCase();
    indexMapping.set(id, {
      index: symbolIndex,
      name: problem.title
    });
    backIndexMapping.set(symbolIndex, id);
    ++index;
  }
  let table = {
    header: {
      row: []
    },
    users: {},
    rows: []
  };
  indexMapping.forEach((value, key) => {
    table.header.row.push({
      task: indexMapping.get( key )
    });
  });
  
  let { solutions } = await contests.getSolutions({ contest, user, count: 1e9, ignoreFreeze: true, sort: 'ASC' });
  let contestants = await contest.getContestants({
    order: 'UserContestEnter.id ASC'
  });
  
  for (let contestant of contestants) {
    if (!Array.isArray(table.users[ contestant.id ])
      && (!contestant.isAdmin || user.isAdmin)) {
      table.users[ contestant.id ] = {
        info: contestant,
        problems: {},
        row: [],
        score: 0,
        solutions: 0,
        solutionsInTime: 0
      };
    }
  }
  
  for (let currentUserId in table.users) {
    let currentUser = table.users[ currentUserId ];
    for (let taskIndex in table.header.row) {
      currentUser.problems[
        table.header.row[ taskIndex ].task.index
      ] = [];
    }
  }
  
  for (let solution of solutions) {
    if (typeof table.users[ solution.userId ] === 'undefined') {
      continue;
    }
    try {
      let internalSymbolIndex = indexMapping.get( solution.problemId ).index;
      table.users[ solution.userId ].problems[ internalSymbolIndex ].push(solution);
    } catch (err) {
      console.log(err);
    }
  }
  
  for (let currentUserIndex in table.users) {
    let currentUserObject = table.users[ currentUserIndex ],
      currentUserId = currentUserObject.info.id;
    
    if (currentUserId === user.id || !wasSentInFreezeTime(currentTimeMs) || user.isAdmin) {
      for (let problemSymbolIndex in currentUserObject.problems) {
        let currentSolutions = currentUserObject.problems[ problemSymbolIndex ];
        let wrongsNumber = 0, solutionAccepted = false;
        
        for (let currentSolution of currentSolutions) {
          let scoreMinutes = Math.floor((currentSolution.sentAtMs - contest.startTimeMs) / (60 * 1000));

          if (currentSolution.verdict && currentSolution.verdict.id !== 1) {
            if (currentSolution.verdict.scored) {
              wrongsNumber++;
            }
          } else if (currentSolution.verdict && currentSolution.verdict.id === 1) {
            // когда вердикт - Accepted
            currentUserObject.score += scoreMinutes + wrongsNumber * PENALTY_TIME;
            currentUserObject.solutions++;
            if (wasSentInBasicTime(currentSolution.sentAtMs)) {
              currentUserObject.solutionsInTime++;
            }
            currentUserObject.row.push({
              task: problemSymbolIndex,
              result: wrongsNumber > 0 ? '+' + wrongsNumber : '+',
              time: getAcceptTime(currentSolution.sentAtMs - contest.startTimeMs),
              inPractice: currentSolution.sentAtMs > contest.absoluteDurationTimeMs
            });
            solutionAccepted = true;
            break;
          }
        }
        if (!solutionAccepted) {
          currentUserObject.row.push({
            task: problemSymbolIndex,
            result: wrongsNumber > 0 ? '-' + wrongsNumber : '—'
          });
        }
      }
    } else {
      /* Для других пользователей во время заморозки */
      for (let problemSymbolIndex in currentUserObject.problems) {
        let currentSolutions = currentUserObject.problems[ problemSymbolIndex ];
        let wrongsNumber = 0, solutionAccepted = false, inFreezeChanged = false;
        
        for (let currentSolution of currentSolutions) {
          let scoreMinutes = Math.floor((currentSolution.sentAtMs - contest.startTimeMs) / (60 * 1000));

          if (currentSolution.verdict && currentSolution.verdict.id !== 1) {
            if (currentSolution.verdict.scored && !wasSentInFreezeTime(currentSolution.sentAtMs)) {
              wrongsNumber++;
            } else if (wasSentInFreezeTime(currentSolution.sentAtMs)) {
              inFreezeChanged = true;
            }
          } else if (currentSolution.verdict) {
            // когда вердикт - Accepted
            if (wasSentInFreezeTime(currentSolution.sentAtMs)) {
              inFreezeChanged = true;
              continue;
            }
            currentUserObject.score += scoreMinutes + wrongsNumber * PENALTY_TIME;
            currentUserObject.solutions++;
            if (wasSentInBasicTime(currentSolution.sentAtMs)) {
              currentUserObject.solutionsInTime++;
            }
            currentUserObject.row.push({
              task: problemSymbolIndex,
              result: wrongsNumber > 0 ? '+' + wrongsNumber : '+',
              time: getAcceptTime(currentSolution.sentAtMs - contest.startTimeMs)
            });
            solutionAccepted = true;
            break;
          }
        }
        if (!solutionAccepted) {
          currentUserObject.row.push({
            task: problemSymbolIndex,
            result: wrongsNumber > 0 ? '-' + wrongsNumber : '—',
            frozen: inFreezeChanged
          });
        }
      }
    }
    currentUserObject.score = Math.floor(currentUserObject.score);
  }
  
  let readyTable = {
    header: table.header,
    rows: []
  };
  for (let currentUserIndex in table.users) {
    let currentUserObject = table.users[ currentUserIndex ];
    readyTable.rows.push({
      user: filter(currentUserObject.info.get({ plain: true }), {
        exclude: [ 'password', 'UserContestEnter', 'createdAt', 'updatedAt', 'deletedAt' ]
      }),
      row: currentUserObject.row,
      score: currentUserObject.score,
      solutions: currentUserObject.solutions,
      solutionsInTime: currentUserObject.solutionsInTime
    });
  }
  
  readyTable.rows.sort((y, x) => {
    if (x.solutions === y.solutions) {
      return x.score === y.score ? 0 : (
        (x.score > y.score) ? -1 : 1
      );
    }
    return x.solutions < y.solutions ? -1 : 1;
  });
  
  let currentPlaceCounter = 1, buffer = 0, currentGroupCounter = 1;
  for (let i = 0; i < readyTable.rows.length; ++i) {
    if (!i) {
      readyTable.rows[i].rank = currentPlaceCounter;
      readyTable.rows[i].group = currentGroupCounter;
      continue;
    }
    if (readyTable.rows[i].score === readyTable.rows[i - 1].score
      && readyTable.rows[i].solutions === readyTable.rows[i - 1].solutions) {
      buffer++;
      readyTable.rows[i].rank = currentPlaceCounter;
    } else {
      currentPlaceCounter += buffer + 1;
      buffer = 0;
      readyTable.rows[i].rank = currentPlaceCounter;
    }
    if (readyTable.rows[i].solutions === readyTable.rows[i - 1].solutions) {
      readyTable.rows[i].group = currentGroupCounter;
    } else {
      readyTable.rows[i].group = ++currentGroupCounter;
    }
  }
  
  let contestsGroups = await contest.getGroups();
  let ratings = [];
  for (let contestGroup of contestsGroups) {
    let ratingsForGroup = await usersMethods.getRatingTable({ group: contestGroup });
    ratings.push(...ratingsForGroup);
  }
  console.log(ratings.map(change => {return{id: change.User.id, value: change.User.rating}}));
  readyTable.rows = readyTable.rows.map(row => {
    console.log('User: ', row.user.id);
    let ratingIndex = ratings.findIndex(change => {
      if (!change) {
        return console.log(change);
      }
      console.log(change.User.id, row.user.id);
      return change.User.id === row.user.id;
    });
    let rating = ratings[ratingIndex];
    row.user.rating = rating.User.rating || 0;
    return row;
  });
  
  return readyTable;
}

function getAcceptTime(diffTime) {
  let allSeconds = Math.floor(diffTime / 1000),
    minutes = Math.floor(allSeconds / 60),
    hours = Math.floor(minutes / 60);
  minutes %= 60;
  let leftPad = (number, zeros) => '0'.repeat(zeros) + number;
  let zeroFill = number => leftPad(number, 2 - Math.min(2, number.toString().length)),
    timeFormat = 'hh:mm';
  return timeFormat
    .replace(/(hh)/gi, zeroFill(hours))
    .replace(/(mm)/gi, zeroFill(minutes));
}