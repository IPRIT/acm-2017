import express from 'express';
import * as models from '../../models';
import { extractAllParams } from "../../utils/utils";
import { TableManager } from "../../services/table/table-manager";

const router = express.Router();

router.get('/', (req, res, next) => {
  return _test(
    extractAllParams(req)
  ).then(result => {
    res.json(result);
  }).catch(next);
});

let tableManager = new TableManager(6);

async function _test(params) {
  let { userId } = params;
  let viewAs = await models.User.findByPrimary(userId).then(user => user.get({ plain: true }));

  return tableManager.renderAs(viewAs, params);
}

export default router;