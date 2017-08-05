import { ensureNumber } from "../../utils/utils";
import * as models from '../../models';
import Promise from 'bluebird';
import { parseProblemIdentifier } from "../../utils/utils";
import * as api from './api';
import * as cf from "./cf";
import { capitalize } from "../../utils/utils";

const terminalStatesMapping = {
  'OK': 1,
  'WRONG_ANSWER': 2,
  'COMPILATION_ERROR': 3,
  'RUNTIME_ERROR': 4,
  'PRESENTATION_ERROR': 5,
  'TIME_LIMIT_EXCEEDED': 6,
  'MEMORY_LIMIT_EXCEEDED': 7,
  'IDLENESS_LIMIT_EXCEEDED': 8,
  'SECURITY_VIOLATED': 9
};

export async function getVerdict(solution, systemAccount, receivedRow) {
  return Promise.resolve().then(async () => {
    let contextRow = await getContextRow(solution, systemAccount, receivedRow);
    let { testNumber, executionTime, memory, verdictName } = contextRow;
    let verdictId = getVerdictId(verdictName);
    let verdictInstance = await models.Verdict.findByPrimary(verdictId);
    return {
      id: verdictInstance && verdictInstance.id,
      isTerminal: isTerminal(verdictName),
      name: verdictInstance ? verdictInstance.name : verdictName,
      testNumber: verdictId === 1 ? 0 : testNumber,
      executionTime,
      memory
    }
  });
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

async function getContextRow(solution, systemAccount, receivedRow) {
  let { type, contestNumber, symbolIndex } = parseProblemIdentifier(solution.Problem.foreignProblemIdentifier);
  let userStatus, found = false,
    attemptsNumber = 0, maxAttemptsNumber = 3;
  
  while ((!userStatus || !found) && attemptsNumber < maxAttemptsNumber) {
    await Promise.delay(1000 + attemptsNumber * 500);
    attemptsNumber++;
    userStatus = await api.getUserStatus({
      handle: systemAccount.instance.systemLogin,
      count: 1,
      from: 1
    });
    let { result } = userStatus;
    let contextRow = (result || []).filter(row => {
      return row.id === receivedRow.solutionId;
    }).map(row => {
      return {
        solutionId: row.id,
        handle: systemAccount.instance.systemLogin,
        problemIdentifier: { type, contestNumber, symbolIndex },
        verdictName: capitalize(row.verdict),
        testNumber: ensureNumber(row.passedTestCount) + 1,
        executionTime: ensureNumber(parseFloat((row.timeConsumedMillis / 1000).toFixed(4))),
        memory: ensureNumber(Math.floor(row.memoryConsumedBytes / 1024))
      }
    });
    if (!contextRow.length) {
      continue;
    }
    let foundRow = contextRow[0];
    try {
      foundRow.testNumber = await getTestNumber(systemAccount, receivedRow);
    } catch (err) {
      console.error(err);
    }
    return foundRow;
  }
  return null;
}

export async function getTestNumber(systemAccount, receivedRow) {
  let endpoint = `http://codeforces.com/submissions/${systemAccount.instance.systemLogin}`;
  let $ = await cf.$getPage(endpoint, systemAccount);
  let $row = $(`[data-submission-id="${receivedRow.solutionId}"]`);
  if (!$row.length) {
    return 0;
  }
  let testNumberText = $row.find('.status-verdict-cell').text().trim();
  let testNumberRegex = /(\d+)$/i;
  if (testNumberRegex.test( testNumberText )) {
    return ensureNumber( testNumberText.match( testNumberRegex )[1] );
  }
  return 0;
}