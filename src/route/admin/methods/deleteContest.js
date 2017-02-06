import * as models from "../../../models";
import Promise from 'bluebird';

export function deleteContestRequest(req, res, next) {
  let { contestId } = req.params;
  return Promise.resolve().then(() => {
    return deleteContest(
      Object.assign(req.body, {
        contestId,
        user: req.user
      })
    );
  }).then(result => res.json(result)).catch(next);
}

export async function deleteContest(params) {
  let {
    contest, contestId
  } = params;
  
  if (!contest) {
    contest = await models.Contest.findByPrimary(contestId);
  }
  return contest && contest.update({
    isSuspended: true
  });
}