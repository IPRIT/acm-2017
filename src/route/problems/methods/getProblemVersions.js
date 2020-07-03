import * as models from "../../../models";
import Promise from 'bluebird';
import {ensureNumber} from "../../../utils/utils";

export function getProblemVersionsRequest(req, res, next) {
  return Promise.resolve().then(() => {
    return getProblemVersions(req.params);
  }).then(result => res.json(result)).catch(next);
}

export async function getProblemVersions(params) {
  let {
    problemId
  } = params;

  const problem = await models.Problem.findByPrimary(problemId);

  if (!problem) {
    throw new HttpError('Problem not found');
  }

  return models.ProblemVersionControl.findAll({
    where: {
      problemId
    },
    attributes: [ 'uuid', 'versionNumber' ],
    order: 'versionNumber ASC'
  });
}