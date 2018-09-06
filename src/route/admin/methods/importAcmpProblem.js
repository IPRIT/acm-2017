import * as models from "../../../models";
import Promise from 'bluebird';
import userGroups from './../../../models/User/userGroups';
import { getTaskMeta } from "./scanMethods/acmp/rescanProblem";
import { ensureNumber } from "../../../utils";
import { HttpError } from "../../../utils/http-error";
import { retrieveAcmpProblem } from "./scanMethods/acmp/acmp";

export function importAcmpProblemRequest(req, res, next) {
  return Promise.resolve().then(() => {
    return importAcmpProblem(
      Object.assign(req.params, req.body)
    );
  }).then(result => res.json(result)).catch(next);
}

/**
 * @param {Object} params
 * @return {Promise<Object|some>}
 */
export async function importAcmpProblem(params) {
  let {
    problemId
  } = params;

  problemId = ensureNumber( problemId );

  const problemMeta = await getTaskMeta({ problemId });
  const {
    htmlStatement,
    textStatement
  } = await retrieveAcmpProblem({ internalSystemId: problemId });

  let problem = await models.Problem.findOne({
    where: {
      foreignProblemIdentifier: problemId,
      systemType: 'acmp'
    }
  });

  if (problem) {
    throw new HttpError('Задача с таким id уже есть');
  }

  problem = await models.Problem.create({
      systemType: 'acmp',
      foreignProblemIdentifier: problemId,
      title: problemMeta.name,
      htmlStatement,
      textStatement
  });

  let versionNumber = await models.ProblemVersionControl.getCurrentVersion( problem.id );
  await problem.createProblemVersionControl({
      htmlStatement,
      textStatement,
      title: problemMeta.name,
      versionNumber: versionNumber + 1,
      attachments: ''
  });

  return problem.get({ plain: true });
}