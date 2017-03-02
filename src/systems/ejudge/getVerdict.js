import { ensureNumber } from "../../utils/utils";
import * as models from '../../models';
import Promise from 'bluebird';
import * as accountsMethods from './account';
import request from 'request-promise';
import cheerio from 'cheerio';
import { getEjudgeSolutionId } from "./sendSolution";
import { getSymbolIndex, config, capitalize } from "../../utils";

const terminalStatesMapping = {
  'OK': 1,
  'Wrong answer': 2,
  'Compilation error': 3,
  'Run-time error': 4,
  'Output limit exceeded': 5,
  'Presentation error': 5,
  'Time-limit exceeded': 6,
  'Memory limit exceeded': 7,
  'Idleness limit exceeded': 8,
  'Restricted function': 9,
  'Check failed': 4,
  'Partial solution': 4,
  'Ignored': 11,
  'Disqualified': 12,
  'Security violation': 9,
  'Coding style violation': 9,
  'Wall time-limit exceeded': 6,
  'Pending review': 11,
  'Rejected': 11,
  'Full rejudge': 11,
  'Rejudge': 11,
  'No change': 11
};
const ACM_SOLUTIONS_ENDPOINT = '/cgi-bin/new-judge';

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
  let [ contestId, problemNumber ] = accountsMethods.parseProblemIdentifier(solution.Problem.foreignProblemIdentifier);
  let { jar, sid } = systemAccount;
  let attemptsNumber = 0, maxAttemptsNumber = 3;
  
  while (attemptsNumber < maxAttemptsNumber) {
    await Promise.delay(1000 + attemptsNumber * 500);
    attemptsNumber++;
    let endpoint = getEndpoint(ACM_SOLUTIONS_ENDPOINT);
    let response = await request({
      method: 'GET',
      uri: endpoint,
      qs: {
        SID: sid
      },
      simple: false,
      resolveWithFullResponse: true,
      followAllRedirects: true,
      encoding: 'utf8',
      jar
    });
    if (!response.body || ![ 200 ].includes(response.statusCode)) {
      throw new Error('Service Unavailable');
    }
  
    let $ = cheerio.load(response.body);
    let rows = [];
    $('table.b1').find('tr').slice(1).each((index, row) => {
      let $row = $(row);
      let sentIdDirty = $row.find('td').eq(0).text();
      try {
        let probablySolutionId = ensureNumber(sentIdDirty.match(/(\d+)/i)[1]);
        let username = $row.find('td').eq(2).text().trim();
        let symbolIndex = $row.find('td').eq(3).text().trim().toLowerCase();
        let verdictName = $row.find('td').eq(5).find('a').eq(0).text().trim();
        let testNumber = ensureNumber($row.find('td').eq(6).text());
        rows.push({
          solutionId: getEjudgeSolutionId(contestId, probablySolutionId),
          username,
          symbolIndex,
          verdictName,
          testNumber,
          executionTime: 0,
          memory: 0
        });
      } catch (error) {}
    });
  
    for (let row of rows) {
      if (row.solutionId === receivedRow.solutionId) {
        return row;
      }
    }
  }
  return null;
}

function getEndpoint(pathTo = '') {
  let { host, protocol } = config.ejudge;
  return `${protocol}://${host}${pathTo}`;
}