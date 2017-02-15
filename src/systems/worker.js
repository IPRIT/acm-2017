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
  }).catch(console.error.bind(console));
}

async function _task() {
  //console.log('Gathering new solutions...');
 /* let availableSystemTypes = await manager.getAvailableSystemTypes();
  let inProcessSolutionIds = manager.getInProcessSolutionIds();
  console.log(availableSystemTypes, inProcessSolutionIds);
  
  let gatheredSolutions = await models.Solution.findAll({
    where: {
      id: {
        $notIn: inProcessSolutionIds
      }
    },
    include: [{
      model: models.Problem,
      required: true,
      where: {
        $in: availableSystemTypes
      }
    }, models.Language ],
    group: 'Problem.systemType',
    order: 'id ASC',
    limit: 1
  });*/
}