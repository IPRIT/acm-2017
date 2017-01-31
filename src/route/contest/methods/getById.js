import { filterEntity as filter } from '../../../utils';
import * as models from "../../../models";
import Promise from 'bluebird';

export function getByIdRequest(req, res, next) {
  return Promise.resolve().then(() => {
    return getById(req.params);
  }).then(result => res.json(result)).catch(next);
}

export async function getById(params) {
  let {
    contestId
  } = params;
  
  return models.Contest.findByPrimary(contestId, {
    include: [ models.Group, {
      association: models.Contest.associations.Author
    }]
  }).then(contest => {
    let exclude = [ 'GroupsToContests' ];
    return filter(contest.get({ plain: true }), {
      exclude,
      replace: [
        [ 'Groups', 'allowedGroups' ],
        [ 'Author', 'author' ]
      ],
      deep: true
    });
  }).then(contest => {
    return { contest }
  });
}