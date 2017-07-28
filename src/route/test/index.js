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
  let cell = new Cell();
  cell.dispose();
  return cell;
}

export default router;