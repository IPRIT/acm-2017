import * as yandex from "../../../../../systems/yandex.official";
import { parseYandexIdentifier } from "../../../../../utils";
import * as models from '../../../../../models';

export async function rescanYandexOfficialProblem(params) {
  let {
    problemId, problem
  } = params;

  if (!problem) {
    problem = await models.Problem.findByPrimary(problemId);
    if (!problem) {
      throw HttpError('Problem not found');
    }
  }
  let parsedIdentifier = parseYandexIdentifier(problem.foreignProblemIdentifier);
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