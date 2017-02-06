import * as models from "../../../models";
import Promise from 'bluebird';
import userGroups from './../../../models/User/userGroups';
import * as contests from '../../contest/methods';

export function setVerdictRequest(req, res, next) {
  let params = Object.assign(
    Object.assign(req.params, req.body), {
      user: req.user,
    }
  );
  return Promise.resolve().then(() => {
    return setVerdict(params);
  }).then(result => res.json(result)).catch(next);
}

export async function setVerdict(params) {
  let {
    solutionId, verdictId
  } = params;
  
  let solution = await models.Solution.findByPrimary(solutionId);
  return solution.update({
    verdictId
  });
}