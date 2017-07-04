import * as timus from './timus';
import * as acmp from './acmp';
import * as cf from './cf';
import * as ejudge from './ejudge';
import * as yandex from './yandex';
import * as yandexOfficial from './yandex.official';

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
  await system.handle( solution ).finally(() => {
    inProcessSolutionsMap.delete(solution.id)
  });
  return solution;
}