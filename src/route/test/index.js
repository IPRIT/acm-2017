import express from 'express';
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
  let b = 1;
  let cell = new Cell();
  cell.repository.commit({ a: b++ }, 10000);
  cell.repository.commit({ a: b++ }, 20000);
  cell.repository.commit({ a: b++ }, 30000);
  cell.repository.commit({ a: b++ }, 50000);
  cell.repository.commit({ a: b++ }, 60000);
  cell.repository.commit({ a: b++ }, 70000);
  cell.repository.commit({ a: b++ }, 80000);
  cell.repository.commit({ a: b++ }, 80002);
  cell.repository.commit({ a: b++ }, 81000);
  cell.repository.commit({ a: b++ }, 90000);
  cell.repository.commit({ a: b++ }, 100000);
  cell.repository.commit({ a: b++ }, 110000);

  /* actions */

  return cell.repository.getPlainCommits(
    cell.repository.getCommitsBeforeTimeMs(89999)
  )
}

export default router;