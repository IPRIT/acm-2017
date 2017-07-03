import * as models from '../../../../../models';
import { retrieveCfProblem } from "./cf";
import { parseProblemIdentifier } from "../../../../../utils/utils";

export async function rescanCfProblem(params) {
  let {
    problemId, problem
  } = params;

  if (!problem) {
    problem = await models.Problem.findByPrimary(problemId);
    if (!problem) {
      throw HttpError('Problem not found');
    }
  }
  let parsedProblemIdentifier = parseProblemIdentifier(problem.foreignProblemIdentifier);
  let taskMeta = {
    name: problem.title,
    ...parsedProblemIdentifier
  };
  let { htmlStatement, textStatement, attachments } = await retrieveCfProblem(taskMeta);
  let stringifiedAttachments = typeof attachments === 'object' ? JSON.stringify(attachments) : attachments;

  let versionNumber = await models.ProblemVersionControl.getCurrentVersion(problem.id);

  await problem.update({
    htmlStatement,
    textStatement,
    title: taskMeta.name,
    attachments: stringifiedAttachments
  });
  return problem.createProblemVersionControl({
    htmlStatement,
    textStatement,
    title: taskMeta.name,
    versionNumber: versionNumber + 1,
    attachments: stringifiedAttachments
  });
}