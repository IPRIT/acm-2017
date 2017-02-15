import Promise from 'bluebird';
import * as manager from './manager';
import * as models from '../models';

const timeFrameMs = 1 * 1000;

let interval;

export function run() {
  stop();
  interval = setInterval(task, timeFrameMs);
}

export function stop() {
  if (interval) {
    clearInterval(interval);
    interval = null;
  }
}

function task() {
  return Promise.resolve().then(() => {
    return _task();
  }).catch(console.error.bind(console, 'Task error:'));
}

async function _task() {
  console.log('Gathering new solutions...');
  let availableSystemTypes = await manager.getAvailableSystemTypes();
  let inProcessSolutionIds = manager.getInProcessSolutionIds();
  console.log(availableSystemTypes, inProcessSolutionIds);
  
  if (!availableSystemTypes.length) {
    return;
  }
  
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
  
  let gatheredSolutions = await models.Solution.findAll({
    where: solutionsWhere,
    include: [{
      model: models.Problem,
      required: true,
      where: problemsWhere
    }, models.Language ],
    group: 'Problem.systemType',
    order: 'id ASC'
  });
  
  for (let solution of gatheredSolutions) {
    manager.send(solution);
  }
}