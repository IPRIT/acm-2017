import * as models from "../../../models";
import Promise from 'bluebird';
import userGroups from './../../../models/User/userGroups';
import * as contests from '../../contest/methods';
import { makeSourceWatermark, SYNTAX_PYTHON_LITERAL_COMMENT } from "../../../utils/utils";

export function duplicateSolutionRequest(req, res, next) {
  let params = Object.assign(
    Object.assign(req.params, req.body), {
      user: req.user,
    }
  );
  return Promise.resolve().then(() => {
    return duplicateSolution(params);
  }).then(result => res.json(result)).catch(next);
}

export async function duplicateSolution(params) {
  let {
    solutionId, asAdmin = false
  } = params;
  
  let solution = await models.Solution.findByPrimary(solutionId);
  let contest = await solution.getContest();
  let problem = await solution.getProblem();
  let language = await solution.getLanguage();
  
  let newSolution = await contest.createSolution({
    userId: asAdmin ? 2 : solution.userId,
    problemId: problem.id,
    languageId: language.id,
    sourceCode: solution.sourceCode,
    ip: solution.ip,
    duplicatedFromId: solution.id,
    nextAttemptWillBeAtMs: Date.now()
  });
  
  if (problem.systemType === 'cf') {
    if ([ 'c', 'csharp', 'java', 'javascript', 'php' ].includes(language.languageFamily)) {
      await makeSourceWatermark({ solutionInstance: newSolution });
    } else if ([ 'python' ].includes(language.languageFamily)) {
      await makeSourceWatermark({ solutionInstance: newSolution, commentLiteral: SYNTAX_PYTHON_LITERAL_COMMENT });
    }
  }
  return newSolution;
}