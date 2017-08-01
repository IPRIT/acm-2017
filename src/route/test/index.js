import express from 'express';
import * as models from '../../models';
import * as contestMethods from '../../route/contest/methods';
import { Cell } from "../../services/table/cell";
import { extractAllParams } from "../../utils/utils";
import { ContestValue } from "../../services/table/contest-value";
import { Row } from "../../services/table/row";
import { ContestTable } from "../../services/table/table";

const router = express.Router();

let table;

router.get('/', (req, res, next) => {
  return _test(
    extractAllParams(req)
  ).then(result => {
    res.json(result);
  }).catch(next);
});

async function _test(params) {
  let { contestId, userId } = params;
  let viewAs = await models.User.findByPrimary(userId).then(user => user.get({ plain: true }));

  if (table) {
    return table.render(viewAs, params);
  }

  let solutions = await models.Solution.findAll({
    where: {
      contestId,
      verdictId: {
        $ne: null
      }
    },
    include: [ models.Verdict ]
  });

  solutions = solutions.map(solution => solution.get({ plain: true }));

  let filteredSolutions = solutions.filter(solution => {
    return solution.Verdict.scored || solution.Verdict.id === 1;
  });

  let acceptedSolutions = solutions.filter(solution => {
    return solution.Verdict.id === 1;
  });

  let contest = await models.Contest.findByPrimary(contestId);
  let contestProblems = await contestMethods.getProblems({ contest, userId });
  let contestParticipants = await contest.getContestants().map(user => user.get({ plain: true }));

  table = new ContestTable(contest, contestProblems, contestParticipants, []);

  //filteredSolutions.forEach(solution => table.addSolution(solution, false));

  let index = 0;
  let interval = setInterval(() => {
    if (index >= filteredSolutions.length - 1) {
      clearInterval(interval);
    }
    table.addSolution(filteredSolutions[ index++ ]);
  }, 1);

  return table.render(viewAs, params);
}

export default router;