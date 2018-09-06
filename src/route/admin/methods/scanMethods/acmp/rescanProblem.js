import * as models from '../../../../../models';
import { ensureNumber, getEndpoint } from "../../../../../utils";
import Promise from 'bluebird';
import request from 'request-promise';
import cheerio from 'cheerio';
import { ACM_HOST, ACM_PROBLEM_PATH, fetchPage, retrieveAcmpProblem } from "./acmp";
import { retrieveTimusProblem } from "../timus/timus";

export async function rescanAcmpProblem(params) {
  let {
    problemId, problem
  } = params;

  if (!problem) {
    problem = await models.Problem.findByPrimary(problemId);
    if (!problem) {
      throw HttpError('Problem not found');
    }
  }
  let taskMeta = await getTaskMeta({ problemId: problem.id });
  let { htmlStatement, textStatement } = await retrieveAcmpProblem(taskMeta);

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

/**
 * @param {number} problemId
 * @return {Promise<{name: string, internalSystemId: number}>}
 */
export async function getTaskMeta({ problemId }) {
  let endpoint = getEndpoint(ACM_HOST, ACM_PROBLEM_PATH, {}, {
    main: 'task',
    id_task: problemId
  });

  let body = await fetchPage( endpoint );
  body = body.replace(/((\<|\>)(\=|\d+))/gi, ' $2 $3 ');
  const $ = cheerio.load( body );
  const name = $( '[background="/images/notepad2.gif"] h1' ).text().trim();

  return {
    name,
    internalSystemId: ensureNumber( problemId )
  };
}