import * as models from "../../../models";
import Promise from 'bluebird';

export function repairContestRequest(req, res, next) {
  let { contestId } = req.params;
  return Promise.resolve().then(() => {
    return repairContest(
      Object.assign(req.body, {
        contestId,
        user: req.user
      })
    );
  }).then(result => res.json(result)).catch(next);
}

export async function repairContest(params) {
  let {
    contest, contestId
  } = params;
  
  if (!contest) {
    contest = await models.Contest.findOne({
      where: {
        id: contestId,
        isSuspended: true
      }
    });
  }
  return contest && contest.update({
    isSuspended: false
  });
}