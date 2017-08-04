import Promise from 'bluebird';
import * as models from "../../../models";
import { RatingsStore } from "../../../utils/ratings-store";
import * as utils from "../../../utils";
import * as services from '../../../services';

export function getTable2Request(req, res, next) {
  return Promise.resolve().then(() => {
    return getTable2(
      utils.extractAllParams(req)
    );
  }).then(result => res.json(result)).catch(next);
}

export async function getTable2(params) {
  let {
    contestId, contest,
    userId, user,
    withRatings = true
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

  let viewAs = user.get({ plain: true });
  let table = await services.GlobalTablesManager.getInstance().getTableManager(contest.id).renderAs(viewAs, params);

  if (withRatings) {
    let contestsGroups = await contest.getGroups();
    let ratingsStore = RatingsStore.getInstance();
    if (!ratingsStore.isReady) {
      await ratingsStore.retrieve();
    }

    for (let row of table.rows) {
      let userId = row.user.id;
      for (let contestGroup of contestsGroups) {
        let ratingValue = await ratingsStore.getRatingValue(contestGroup.id, userId);
        if (ratingValue) {
          row.user.rating = ratingValue;
          break;
        }
      }
    }
  }
  return table;
}