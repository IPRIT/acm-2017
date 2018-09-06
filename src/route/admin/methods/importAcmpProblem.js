import * as models from "../../../models";
import Promise from 'bluebird';
import userGroups from './../../../models/User/userGroups';

export function importAcmpProblemRequest(req, res, next) {
  return Promise.resolve().then(() => {
    return importAcmpProblem(
      Object.assign(req.params, req.body)
    );
  }).then(result => res.json(result)).catch(next);
}

export async function importAcmpProblem(params) {
  let {
    problemId
  } = params;

}