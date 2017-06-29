import * as models from "../../../models";
import Promise from 'bluebird';
import userGroups from './../../../models/User/userGroups';
import {extractAllParams} from "../../../utils/utils";

export function updateProblemRequest(req, res, next) {
  return Promise.resolve().then(() => {
    return updateProblem(
      extractAllParams(req)
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
  await problem.update({
    title,
    htmlStatement,
    textStatement,
    attachments: typeof attachments === 'object' ? JSON.stringify(attachments) : attachments
  });
  let versionNumber = await models.ProblemVersionControl.getCurrentVersion(problem.id);
  await problem.createProblemVersionControl({
    htmlStatement,
    textStatement,
    title,
    versionNumber: versionNumber + 1,
    attachments: typeof attachments === 'object' ? JSON.stringify(attachments) : attachments
  });
  return problem;
}