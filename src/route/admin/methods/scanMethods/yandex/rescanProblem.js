import * as yandex from "../../../../../systems/yandex";
import { parseIdentifier } from "../../../../../utils";
import * as models from '../../../../../models';

export async function rescanYandexProblem(params) {
  let {
    problemId, problem
  } = params;

  if (!problem) {
    problem = await models.Problem.findByPrimary(problemId);
    if (!problem) {
      throw HttpError('Problem not found');
    }
  }
  let parsedIdentifier = parseIdentifier(problem.foreignProblemIdentifier);
  let systemAccount = await yandex.getSomeAccount();
  let taskMeta = await yandex.getTaskMeta(parsedIdentifier, systemAccount);
  let { htmlStatement, textStatement } = await yandex.retrieveProblem(taskMeta, systemAccount);

  let versionNumber = await models.ProblemVersionControl.getCurrentVersion(problem.id);

  await problem.update({
    htmlStatement,
    textStatement,
    title: taskMeta.name
  });
  return problem.createProblemVersionControl({
    htmlStatement,
    textStatement,
    title: taskMeta.name,
    versionNumber: versionNumber + 1,
    attachments: ''
  });
}