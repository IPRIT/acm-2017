import { filterEntity as filter } from '../../../utils';
import * as models from "../../../models";
import Promise from 'bluebird';
import * as contests from '../../contest/methods';
import * as deap from "deap/lib/deap";

export function getContestRequest(req, res, next) {
  return Promise.resolve().then(() => {
    return getContest(
      Object.assign(req.params, {
        user: req.user
      })
    );
  }).then(result => res.json(result)).catch(next);
}

export async function getContest(params) {
  let {
    contestId,
    userId, user
  } = params;
  
  return models.Contest.findByPrimary(contestId, {
    include: [ models.Group, {
      association: models.Contest.associations.Author
    }]
  }).then(async contest => {
    let problems = await contests.getProblems({ contest, user });
    let exclude = [ 'GroupsToContests' ];
    contest = filter(contest.get({ plain: true }), {
      exclude,
      replace: [
        [ 'Groups', 'allowedGroups' ],
        [ 'Author', 'author' ]
      ],
      deep: true
    });
    return deap.extend(contest, { problems });
  })
}