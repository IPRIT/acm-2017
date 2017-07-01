import Promise from 'bluebird';
import * as socket from '../../../socket';
import * as models from '../../../models';
import { extractAllParams } from "../../../utils/utils";
import * as scanMethods from "./scanMethods";

export function rescanProblemRequest(req, res, next) {
  return Promise.resolve().then(() => {
    return rescanProblem( extractAllParams(req) );
  }).then(result => res.json(result)).catch(next);
}

const availableMethods = {
  timus: scanMethods.rescanTimusProblem,
  cf: scanMethods.rescanCfProblem
};

export async function rescanProblem(params) {
  let {
    problemId, problem
  } = params;

  if (!problem) {
    problem = await models.Problem.findByPrimary(problemId);
    if (!problem) {
      throw HttpError('Problem not found');
    }
  }

  if (problem.systemType in availableMethods) {
    return availableMethods[ problem.systemType ]({ problem });
  } else {
    throw new HttpError('Foreign system not found');
  }
}