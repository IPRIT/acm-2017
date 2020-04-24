import * as utils from "../../utils/utils";
import * as yandex from './index';
import * as models from '../../models';

const testingFailedVerdictName = 'не удалось протестировать';

// [verdict name] -> [verdict id]
const terminalStatesMapping = {
  'OK': 1,
  'WA': 2,
  'CE': 3,
  'RE': 4,
  'PCF': 4,
  'PE': 5,
  'OL': 5,
  'TL': 6,
  'ML': 7,
  'IL': 8,
  'Crash': 19,
  [testingFailedVerdictName]: 19
};

export async function getVerdict(solution, systemAccount, receivedRow) {
  let parsedProblemIdentifier = utils.parseYandexIdentifier(solution.Problem.foreignProblemIdentifier);
  let endpoint = yandex.getSubmitsEndpoint(solution);

  let $ = await yandex.$getPage(endpoint, systemAccount);
  let rows = yandex.getSubmits($, parsedProblemIdentifier.symbolIndex);

  let contextRow;
  for (let row of rows) {
    if (Number(receivedRow.solutionId) === Number(row.solutionId)) {
      contextRow = row;
      break;
    }
  }
  if (!contextRow) {
    throw new Error('Solution not found in the table');
  }
  let { testNumber, executionTime, memory, verdictName } = contextRow;
  let verdictId = getVerdictId(verdictName);
  let verdictInstance = await models.Verdict.findByPrimary(verdictId);
  return {
    id: verdictId,
    isTerminal: isTerminal(verdictName),
    name: verdictInstance ? verdictInstance.name : verdictName,
    testNumber: verdictId === 1 ? 0 : testNumber,
    executionTime,
    memory
  }
}

function isTerminal(verdictName = '') {
  verdictName = verdictName.toLowerCase();
  return Object.keys(terminalStatesMapping).some(state => {
    return verdictName.indexOf(state.toLowerCase()) !== -1;
  });
}

function getVerdictId(verdictName) {
  verdictName = verdictName.toLowerCase();
  let verdicts = Object.keys(terminalStatesMapping).filter(state => {
    return verdictName.indexOf(state.toLowerCase()) !== -1;
  });
  if (!verdicts.length) {
    return null;
  }
  return terminalStatesMapping[ verdicts[0] ];
}