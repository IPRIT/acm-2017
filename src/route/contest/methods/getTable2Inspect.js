import Promise from 'bluebird';
import * as models from "../../../models";
import { RatingsStore } from "../../../utils/ratings-store";
import * as utils from "../../../utils";
import * as services from '../../../services';

function stringify(o) {
  let cache = [];
  return JSON.stringify(o, (key, value) => {
    if (typeof value === 'object' && value !== null) {
      if (cache.indexOf(value) !== -1) {
        // Circular reference found, discard key
        return value.hash || value.id || null;
      }
      // Store value in our collection
      cache.push(value);
    }
    return value;
  });
}

export function getTable2InspectRequest(req, res, next) {
  return Promise.resolve().then(() => {
    return getTable2Inspect(
      utils.extractAllParams(req)
    );
  }).then(result => res.json(JSON.parse(stringify(result)))).catch(next);
}

export async function getTable2Inspect(params) {
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

  let tableManager = services.GlobalTablesManager.getInstance().getTableManager(contest.id);
  return tableManager;
}