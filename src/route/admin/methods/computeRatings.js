import * as models from "../../../models";
import Promise from 'bluebird';
import * as contestMethods from '../../contest/methods';
import { extractAllParams } from "../../../utils/utils";
import { RatingsStore } from "../../../utils/ratings-store";
import * as services from "../../../services";

export function computeRatingsRequest(req, res, next) {
  return Promise.resolve().then(() => {
    return computeRatings( extractAllParams(req) );
  }).then(async result => {
    await RatingsStore.getInstance().update();
    res.json(result);
  }).catch(next);
}

const INITIAL_RATING = 1500;

export async function computeRatings(params) {
  let {
  } = params;
  
  // initiator user
  let user = await models.User.findByPrimary(2);
  let results = [];
  let ratingsMap = new Map();
  let versionTimeStampMs = Date.now();
  let versionNumber = await models.RatingChange.getCurrentVersion();
  
  let groups = await models.Group.findAll();
  
  for (let group of groups) {
    let groupUsers = await group.getUsers();
    let groupUsersIds = groupUsers.map(user => user.id);
  
    let contests = await group.getContests({
      where: {
        isRated: true
      },
      order: 'startTimeMs ASC'
    });
    
    for (let contest of contests) {
      let table = await services.GlobalTablesManager.getInstance().getTableManager(contest.id).renderAs( user.get({ plain: true }), { count: Infinity } );
  
      let rank = 1, lastScore;
      table.rows = table.rows.filter(tableRow => {
        return groupUsersIds.includes( tableRow.user.id );
      }).map(tableRow => {
        if (typeof lastScore !== 'undefined'
          && tableRow.penalty !== lastScore) {
          rank++;
        }
        tableRow.rank = rank;
        lastScore = tableRow.penalty;
        tableRow.rating = ratingsMap.has(getUserToGroupKey(tableRow, group))
          ? ratingsMap.get(getUserToGroupKey(tableRow, group)) : INITIAL_RATING;
        return tableRow;
      });
  
      table.rows = table.rows.map(contestant => {
        contestant.seed = computeSeed(contestant, table.rows);
        return contestant;
      });
  
      table.rows = table.rows.map(contestant => {
        contestant.R = searchRatingByRank(
          computeGeometricMeanForContestant(contestant),
          table.rows
        );
        contestant.ratingChange = ((contestant.R - contestant.rating) / 2) / 3;
        if (contestant.ratingChange > 30) {
            contestant.ratingChange = 30 + (contestant.ratingChange - 30) / 2;
        }
        return contestant;
      });
  
      preventInflation(table.rows);
  
      table.rows = table.rows.map(contestant => {
        contestant.ratingBefore = contestant.rating;
        contestant.rating += contestant.ratingChange;
        ratingsMap.set(getUserToGroupKey(contestant, group), contestant.rating);
        return contestant;
      });
      
      await saveResults(contest, group, table.rows, { versionTimeStampMs, versionNumber: versionNumber + 1 });
      
      results.push({
        contestId: contest.id,
        contest: contest,
        groupId: group.id,
        result: table.rows
      });
    }
  }
  
  results.sort((a, b) => b.contest.startTimeMs - a.contest.startTimeMs);
  
  return results.length;
}

/**
 * Computes probability that contestant A win contestant B.
 * @param ratingA
 * @param ratingB
 * @return {number}
 */
function computeEloPropability(ratingA, ratingB) {
  return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
}

/**
 * Returns expected rank of user before contest
 * @param contestant
 * @param contestants
 * @return {number}
 */
function computeSeed(contestant, contestants = []) {
  return contestants.reduce((accumulator, currentContestant) => {
    if (currentContestant.user.id === contestant.user.id) {
      return accumulator;
    }
    return accumulator + computeEloPropability(currentContestant.rating, contestant.rating);
  }, 1);
}

/**
 * Returns expected rank of user before contest
 * @param contestantRating
 * @param contestants
 * @return {number}
 */
function computeSeedByRating(contestantRating, contestants = []) {
  return contestants.reduce((accumulator, currentContestant) => {
    return accumulator + computeEloPropability(currentContestant.rating, contestantRating);
  }, 1);
}

function computeGeometricMean(realRank, expectedRank) {
  return Math.sqrt(realRank * expectedRank);
}

function computeGeometricMeanForContestant(contestant) {
  return computeGeometricMean(contestant.rank, contestant.seed);
}

function searchRatingByRank(rank, contestants) {
  let left = 1;
  let right = 8000;
  
  while (right - left > 1) {
    let mid = (left + right) / 2;
    if (computeSeedByRating(mid, contestants) < rank) {
      right = mid;
    } else {
      left = mid;
    }
  }
  return left;
}

function preventInflation(contestants) {
  contestants.sort((a, b) => b.rating - a.rating);
  
  let ratingChangesSum = contestants.reduce((sum, contestant) => {
    return sum + contestant.ratingChange;
  }, 0);
  console.log('ratingChangesSum =', ratingChangesSum);
  let bias = -1 * ratingChangesSum / contestants.length - 1;
  contestants.forEach(contestant => {
    contestant.ratingChange += bias;
  });
  
  let topGroupSize = Math.min(
    Math.floor(
      4 * Math.round(
        Math.sqrt(contestants.length)
      )
    ),
    contestants.length
  );
  let topRatingChangesSum = contestants.slice(0, topGroupSize).reduce((sum, contestant) => {
    return sum + contestant.ratingChange;
  }, 0);
  let topBias = Math.min(
    Math.max(-1 * topRatingChangesSum / topGroupSize, -10),
    0
  );
  contestants.forEach(contestant => {
    contestant.ratingChange += topBias;
  });
}

function getUserToGroupKey(contestant, group) {
  return [ contestant.user.id, group.id ].join('_');
}

async function saveResults(contest, group, contestants, { versionNumber, versionTimeStampMs }) {
  let contestId = contest.id,
    groupId = group.id;
  
  let promises = [];
  for (let contestant of contestants) {
    promises.push(
      models.RatingChange.create({
        realRank: contestant.rank,
        expectedRank: contestant.seed,
        score: contestant.penalty,
        ratingBefore: contestant.ratingBefore,
        ratingAfter: contestant.rating,
        ratingChange: contestant.ratingChange,
        R: contestant.R,
        contestId,
        groupId,
        userId: contestant.user.id,
        versionNumber,
        versionTimeStampMs
      })
    );
  }
  return Promise.all(promises);
}

