import express from 'express';
import * as models from '../../models';
import { Cell } from "../../services/table/cell";
import { extractAllParams } from "../../utils/utils";

const router = express.Router();

router.get('/', (req, res, next) => {
  return _test(
    extractAllParams(req)
  ).then(result => {
    res.json(result);
  }).catch(next);
});

async function _test(params) {
  let userId = 17,
    problemId = 2532,
    contestId = 118;

  let cell = new Cell(userId, problemId, 'E');

  let solutions = await models.Solution.findAll({
    where: {
      contestId,
      problemId,
      userId,
      verdictId: {
        $ne: null
      }
    },
    include: [ models.Verdict ]
  });

  let contest = await models.Contest.findByPrimary(contestId);

  cell.setContest( contest );

  for (let solution of solutions) {
    if (solution.Verdict.scored || solution.Verdict.id === 1) {
      cell.addSolution( solution );
    }
  }

  return cell.getDisplayCellValue(
    cell.repository.getCommits()[0].realCreatedAtMs - 1
  );
}

export default router;