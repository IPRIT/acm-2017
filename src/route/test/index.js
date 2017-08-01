import express from 'express';
import * as models from '../../models';
import * as contestMethods from '../../route/contest/methods';
import { Cell } from "../../services/table/cell";
import { extractAllParams } from "../../utils/utils";
import { ContestValue } from "../../services/table/contest-value";
import { Row } from "../../services/table/row";
import { ContestTable } from "../../services/table/table";
import { TableManager } from "../../services/table/table-manager";
import Promise from 'bluebird';

const router = express.Router();

let table;

router.get('/', (req, res, next) => {
  return _test(
    extractAllParams(req)
  ).then(result => {
    res.json(result);
  }).catch(next);
});

/*let tableManager = new TableManager(6);
tableManager.selfDestructSubject$.subscribe(tableDestroyed => {
  console.log('Table table destroyed event:', tableDestroyed);
});*/

let tableManager = new TableManager(6);

async function _test(params) {
  let { userId } = params;
  let viewAs = await models.User.findByPrimary(userId).then(user => user.get({ plain: true }));

  return tableManager.renderAs(viewAs, params);
}

export default router;