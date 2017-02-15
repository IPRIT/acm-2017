import * as timus from './timus';

const systems = { timus };
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
  await system.handle( solution );
  inProcessSolutionsMap.delete(solution.id);
  return solution;
}