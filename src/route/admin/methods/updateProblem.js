import * as models from "../../../models";
import Promise from 'bluebird';
import userGroups from './../../../models/User/userGroups';

export function updateProblemRequest(req, res, next) {
  return Promise.resolve().then(() => {
    return updateProblem(
      Object.assign(req.params, req.body)
    );
  }).then(result => res.json(result)).catch(next);
}

export async function updateProblem(params) {
  let {
    problemId, title,
    htmlStatement, textStatement,
    attachments
  } = params;
  
  let problem = await models.Problem.findByPrimary(problemId);
  return problem.update({
    title,
    htmlStatement,
    textStatement,
    attachments: typeof attachments === 'object' ? JSON.stringify(attachments) : attachments
  });
}