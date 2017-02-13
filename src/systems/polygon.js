import * as timus from './timus';
import * as models from '../models';
import express from 'express';
import { rightsAllocator, userRetriever, canJoinContest, isJsonRequest } from '../utils';
import Promise from 'bluebird';

const router = express.Router();

router.get('/', test);

async function test(req, res, next) {
  return Promise.resolve().then(() => {
    return _test();
  }).then(result => res.end()).catch(next);
}

async function _test() {
  let solution = await models.Solution.findByPrimary(12499, {
    include: [ models.Problem, models.Language ]
  });
  
  return timus.handle(solution);
}

export default router;