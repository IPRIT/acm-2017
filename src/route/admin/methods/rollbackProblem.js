import * as models from "../../../models";
import Promise from 'bluebird';
import { extractAllParams } from "../../../utils/utils";

export function rollbackProblemRequest(req, res, next) {
  return Promise.resolve().then(() => {
    return rollbackProblem( extractAllParams(req) );
  }).then(result => res.json(result)).catch(next);
}

export async function rollbackProblem(params) {
  let {
    problemId, versionNumber
  } = params;

  let problem = await models.Problem.findByPrimary(problemId);
  if (!problem) {
    throw new HttpError('Problem not found');
  }
  let version = await models.ProblemVersionControl.findOne({
    where: {
      versionNumber,
      problemId
    }
  });
  if (!version) {
    throw new HttpError('Version not found');
  }
  let latestVersionNumber = await models.ProblemVersionControl.getCurrentVersion(problem.id);

  await problem.update({
    htmlStatement: version.htmlStatement,
    textStatement: version.textStatement,
    title: version.title,
    attachments: typeof version.attachments === 'object' ? JSON.stringify(version.attachments) : ''
  });
  return await problem.createProblemVersionControl({
    htmlStatement: version.htmlStatement,
    textStatement: version.textStatement,
    title: version.title,
    versionNumber: latestVersionNumber + 1,
    attachments: typeof version.attachments === 'object' ? JSON.stringify(version.attachments) : ''
  });
}