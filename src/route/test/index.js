import express from 'express';
import * as models from '../../models';
import { extractAllParams } from "../../utils/utils";
import * as services from "../../services";

const router = express.Router();

router.get('/', (req, res, next) => {
  return _test(
    extractAllParams(req)
  ).then(result => {
    res.json(result);
  }).catch(next);
});

let timeoutId;

async function _test(params) {
  let { userId = 1, contestId = 6 } = params;
  let viewAs = await models.User.findByPrimary(userId).then(user => user.get({ plain: true }));

  //await services.GlobalTablesManager.getInstance().getTableManager(contestId).renderAs(viewAs, params);
  timeoutId = setTimeout(async () => {
    let solution = await models.Solution.findByPrimary( 450 );
    for (let i = 1; i < 200; ++i) {
      //await services.GlobalTablesManager.getInstance().getTableManager(contestId).removeRow( i );
    }
  }, 2000);
  return services.GlobalTablesManager.getInstance().getTableManager(contestId).renderAs(viewAs, params);
}

export default router;