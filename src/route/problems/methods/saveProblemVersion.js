import * as models from "../../../models";
import Promise from 'bluebird';
import { ensureNumber, extractAllParams } from "../../../utils/utils";

export function saveProblemVersionRequest(req, res, next) {
  return Promise.resolve().then(() => {
    return saveProblemVersion(extractAllParams(req));
  }).then(result => res.json(result)).catch(next);
}

export async function saveProblemVersion(params) {
  const {
    problemId,
    versionId,
    contestId,
  } = params;

  const problem = await models.Problem.findByPrimary(problemId);
  const version = await models.ProblemVersionControl.findByPrimary(versionId);
  const contest = await models.Contest.findByPrimary(contestId);

  if (!problem) {
    throw new HttpError('Problem not found');
  }
  if (!version && versionId !== '-') {
    throw new HttpError(`Version ${versionId} not found`);
  }
  if (!contest) {
    throw new HttpError('Contest not found');
  }

  const problemToContest = await models.ProblemToContest.findOne({
    where: {
      problemId,
      contestId
    }
  });

  if (!problemToContest) {
    throw new HttpError('Problem not in contest');
  }

  return problemToContest.update({
    versionId: versionId === '-' ? null : versionId
  });
}