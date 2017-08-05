import * as timus from './timus';
import * as acmp from './acmp';
import * as cf from './cf';
import * as ejudge from './ejudge';
import * as yandex from './yandex';
import * as yandexOfficial from './yandex.official';
import * as services from '../services';
import * as models from '../models';

const systems = { timus, acmp, cf, ejudge, yandex, yandexOfficial };
let inProcessSolutionsMap = new Map();

export async function getAvailableSystemTypes() {
  let availableSystemTypes = [];
  for (let systemType in systems) {
    let freeAccounts = await systems[ systemType ].getFreeAccountsNumber();
    if (freeAccounts > 0) {
      availableSystemTypes.push( systemType );
    }
  }
  return availableSystemTypes;
}

export function getInProcessSolutionIds() {
  return [ ...inProcessSolutionsMap.keys() ];
}

export async function send(solution) {
  let problem = solution.Problem;
  if (!problem) {
    throw new Error('Problem not found');
  }
  let { systemType } = problem;
  let system = systems[ systemType ];
  if (!system) {
    throw new Error('System not found');
  }
  inProcessSolutionsMap.set(solution.id, solution);
  await system.handle( solution ).then(() => {
    return models.Verdict.findByPrimary(solution.verdictId);
  }).then(verdict => {
    return _updateContestTable(solution, verdict);
  }).finally(async () => {
    inProcessSolutionsMap.delete(solution.id);
  });
  return solution;
}

/**
 * @param {Solution} solution
 * @param {Verdict} verdict
 * @return {*}
 * @private
 */
function _updateContestTable(solution, verdict) {
  if (verdict.id !== 1 && !verdict.scored) {
    return;
  }
  console.log('Updating contest table...');
  return services.GlobalTablesManager
    .getInstance()
    .getTableManager( solution.contestId )
    .addSolution( solution );
}