import { filterEntity as filter } from '../../../utils';
import { ensureValue } from "../../../utils";
import * as models from "../../../models";
import Promise from 'bluebird';
import Sequelize from 'sequelize';

export default function (req, res, next) {
  return Promise.resolve().then(() => {
    return getContests(req, res);
  }).then(result => res.json(result)).catch(next);
}

const DEFAULT_CONTESTS_COUNT = 20;
const DEFAULT_CONTESTS_OFFSET = 0;
const DEFAULT_CONTESTS_CATEGORY = 'all';
const DEFAULT_CONTESTS_SORT = 'byId';
const DEFAULT_CONTESTS_SORT_ORDER = 'desc';

async function getContests(req, res) {
  let user = req.user;
  let {
    count = DEFAULT_CONTESTS_COUNT, offset = DEFAULT_CONTESTS_OFFSET,
    category = DEFAULT_CONTESTS_CATEGORY, sort = DEFAULT_CONTESTS_SORT, sort_order = DEFAULT_CONTESTS_SORT_ORDER
  } = req.query;
  
  count = Math.max(Math.min(count, 200), 0);
  offset = Math.max(offset, 0);
  
  var categoryPredicate = [
    'all',
    'showOnlyPractice',
    'showOnlyEnabled',
    'showOnlyDisabled',
    'showOnlyFinished',
    'showOnlyRemoved',
    'showOnlyFrozen',
    'showOnlyStarted'
  ];
  if (!categoryPredicate.includes(category)) {
    category = DEFAULT_CONTESTS_CATEGORY;
  }
  var availableSorts = {
    byId: ['id', sort_order.toUpperCase()], //'contests.id',
    byStart: ['startTimeMs', sort_order.toUpperCase()], //'contests.start_time',
    byCreation: ['createdAt', sort_order.toUpperCase()], //'contests.creation_time'
  };
  if (!(sort in availableSorts)) {
    sort = DEFAULT_CONTESTS_SORT;
  }
  
  return models.Contest.findAll({
    include: [ models.Group ],
    limit: count,
    offset,
    order: [ availableSorts[ sort ] ]
  }).map(contest => {
    let exclude = [ 'GroupsToContests' ];
    return filter(contest.get({ plain: true }), {
      exclude,
      replace: [
        [ 'Groups', 'allowedGroups' ]
      ],
      deep: true
    });
  }).then(async contests => {
    return {
      contests,
      contestsNumber: await models.Contest.count()
    }
  });
}