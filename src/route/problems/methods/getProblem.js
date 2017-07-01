import * as models from "../../../models";
import Promise from 'bluebird';
import {ensureNumber} from "../../../utils/utils";

export function getProblemRequest(req, res, next) {
  return Promise.resolve().then(() => {
    return getProblem(req.params);
  }).then(result => res.json(result)).catch(next);
}

export async function getProblem(params) {
  let {
    problemId, versionNumber
  } = params;

  let problem = await models.Problem.findByPrimary(problemId);
  if (!problem) {
    throw new HttpError('Problem not found');
  }
  let contests = await problem.getContests();
  let versions = await models.ProblemVersionControl.findAll({
    where: {
      problemId
    }
  }).then(versions => versions.sort((a, b) => a.versionNumber - b.versionNumber));
  let latestVersionNumber = ensureNumber(await models.ProblemVersionControl.getCurrentVersion(problem.id));

  if (versionNumber) {
    let problemVersion = await models.ProblemVersionControl.findOne({
      where: {
        versionNumber,
        problemId
      }
    });
    return Object.assign(problemVersion.get({ plain: true }), {
      connectedContests: contests,
      id: problemVersion.problemId,
      systemType: problem.systemType,
      foreignProblemIdentifier: problem.foreignProblemIdentifier,
      createdAt: problem.createdAt,
      versionNumber: ensureNumber(versionNumber),
      latestVersionNumber,
      versions
    });
  } else {
    return Object.assign(problem.get({ plain: true }), {
      connectedContests: contests,
      versionNumber: latestVersionNumber,
      latestVersionNumber,
      versions
    });
  }
}