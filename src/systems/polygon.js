import * as timus from './timus';
import * as models from '../models';
import express from 'express';
import { rightsAllocator, userRetriever, canJoinContest, isJsonRequest } from '../utils';
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
  /*let solution = await models.Solution.findByPrimary(12499, {
    include: [ models.Problem, models.Language ]
  });
  
  return timus.handle(solution);*/
  
  let availableSystemTypes = await manager.getAvailableSystemTypes();
  let inProcessSolutionIds = manager.getInProcessSolutionIds();
  console.log(availableSystemTypes, inProcessSolutionIds);
  
  let solutionsWhere = {
    retriesNumber: {
      $lt: 3
    },
    nextAttemptWillBeAtMs: {
      $or: [{
        $lte: Date.now()
      }, null]
    },
    verdictId: null
  };
  let problemsWhere = {};
  
  if (inProcessSolutionIds.length) {
    Object.assign(solutionsWhere, {
      id: {
        $notIn: inProcessSolutionIds
      }
    });
  }
  if (availableSystemTypes.length) {
    Object.assign(problemsWhere, {
      systemType: {
        $in: availableSystemTypes
      }
    });
  }
  
  return models.Solution.findAll({
    where: solutionsWhere,
    include: [{
      model: models.Problem,
      required: true,
      where: problemsWhere
    }, models.Language ],
    group: 'Problem.systemType',
    order: 'id ASC'
  });
}

export default router;