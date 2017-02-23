import * as acmp from './acmp';
import * as models from '../models';
import express from 'express';
import Promise from 'bluebird';
import * as manager from './manager';

const router = express.Router();

router.get('/', test);

async function test(req, res, next) {
  return Promise.resolve().then(() => {
    return _test();
  }).then(result => res.json(result)).catch(next);
}

async function _test() {
  let solution = await models.Solution.findByPrimary(12711, {
    include: [ models.Problem, models.Language ]
  });
  return acmp.handle(solution);
}

export default router;