import { filterEntity as filter } from '../../../utils';
import * as models from "../../../models";
import Promise from 'bluebird';

export function getContestsRequest(req, res, next) {
  return Promise.resolve().then(() => {
    return getContests(req.query);
  }).then(result => res.json(result)).catch(next);
}

const DEFAULT_CONTESTS_COUNT = 20;
const DEFAULT_CONTESTS_OFFSET = 0;
const DEFAULT_CONTESTS_CATEGORY = 'all';
const DEFAULT_CONTESTS_SORT = 'byId';
const DEFAULT_CONTESTS_SORT_ORDER = 'desc';

export async function getContests(params) {
  let {
    count = DEFAULT_CONTESTS_COUNT, offset = DEFAULT_CONTESTS_OFFSET,
    category = DEFAULT_CONTESTS_CATEGORY, sort = DEFAULT_CONTESTS_SORT, sort_order = DEFAULT_CONTESTS_SORT_ORDER
  } = params;
  
  count = Math.max(Math.min(count, 200), 0);
  offset = Math.max(offset, 0);
  
  let currentTimeMs = new Date().getTime();
  let categoryPredicate = {
    all: {},
    showOnlyPractice: [
      'startTimeMs + durationTimeMs < ? AND startTimeMs + durationTimeMs + practiceDurationTimeMs > ? AND isSuspended = false',
      currentTimeMs, currentTimeMs
    ],
    showOnlyEnabled: { isEnabled: true },
    showOnlyDisabled: { isEnabled: false },
    showOnlyFinished: [ 'startTimeMs + durationTimeMs + practiceDurationTimeMs < ? AND isSuspended = false', currentTimeMs ],
    showOnlyRemoved: { isSuspended: true },
    showOnlyFrozen: [
      'startTimeMs + relativeFreezeTimeMs < ? AND startTimeMs + durationTimeMs > ? AND isSuspended = false',
      currentTimeMs, currentTimeMs
    ],
    showOnlyStarted: [ 'startTimeMs < ? AND startTimeMs + durationTimeMs > ? AND isSuspended = false', currentTimeMs, currentTimeMs ]
  };
  if (!(category in categoryPredicate)) {
    category = DEFAULT_CONTESTS_CATEGORY;
  }
  let availableSorts = {
    byId: ['id', sort_order.toUpperCase()], //'contests.id',
    byStart: ['startTimeMs', sort_order.toUpperCase()], //'contests.start_time',
    byCreation: ['createdAt', sort_order.toUpperCase()], //'contests.creation_time'
  };
  if (!(sort in availableSorts)) {
    sort = DEFAULT_CONTESTS_SORT;
  }
  return models.Contest.findAll({
    include: [ models.Group, { model: models.User, association: models.Contest.associations.Author } ],
    limit: count,
    offset,
    order: [ availableSorts[ sort ] ],
    where: categoryPredicate[ category ]
  }).map(contest => {
    let exclude = [ 'GroupsToContests', 'password' ];
    return filter(contest.get({ plain: true }), {
      exclude,
      replace: [
        [ 'Groups', 'allowedGroups' ],
        [ 'Author', 'author' ]
      ],
      deep: true
    });
  }).then(async contests => {
    return {
      contests,
      contestsNumber: await models.Contest.count({
        where: categoryPredicate[ category ]
      })
    }
  });
}