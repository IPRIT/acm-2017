import cheerio from 'cheerio';
import querystring from 'querystring';
import url from 'url';
import request from 'request-promise';
import { extractParam, ensureNumber } from "../../utils/utils";
import * as models from '../../models';
import Promise from 'bluebird';

const ACM_PROTOCOL = 'http';
const ACM_HOST = 'acm.timus.ru';
const ACM_AUTHORS_SOLUTIONS_ENDPOINT = '/status.aspx';

const terminalStatesMapping = {
  'Accepted': 1,
  'Wrong answer': 2,
  'Compilation error': 3,
  'Runtime error': 4,
  'Presentation error': 5,
  'Output limit exceeded': 5,
  'Time limit exceeded': 6,
  'Memory limit exceeded': 7,
  'Idleness limit exceeded': 8,
  'Restricted function': 9
};

export async function getVerdict(solution, systemAccount, receivedRow) {
  let endpoint = getEndpoint(ACM_AUTHORS_SOLUTIONS_ENDPOINT);
  return Promise.resolve().then(async () => {
    let body = await request({
      method: 'GET',
      uri: endpoint,
      qs: {
        author: systemAccount.foreignAccountId
      },
      simple: false,
      followAllRedirects: true
    });
  
    const $ = cheerio.load(body);
  
    let rows = [];
    $('table.status').find('tr').slice(1).each((index, row) => {
      let $row = $(row);
      let accountId = extractParam($row.find('.coder a').attr('href'), 'id'),
        nickname = $row.find('.coder a').text(),
        problemIdentifier = extractParam($row.find('.problem a').attr('href'), 'num'),
        solutionId = $row.find('.id').text(),
        verdictName = sanitizeVerdict($row.find('.verdict_wt, .verdict_ac, .verdict_rj').text()),
        testNumber = ensureNumber($row.find('.test').text()),
        executionTime = ensureNumber($row.find('.runtime').text()),
        memory = ensureNumber($row.find('.memory').text().replace(/[^0-9]/gi, ''));
      rows.push({
        accountId,
        nickname,
        problemIdentifier,
        solutionId,
        verdictName,
        testNumber,
        executionTime,
        memory
      });
    });
  
    let contextRow;
    for (let row of rows) {
      if (row.accountId === systemAccount.foreignAccountId
        && receivedRow.solutionId === row.solutionId) {
        contextRow = row;
        break;
      }
    }
    if (!contextRow) {
      throw new Error('Solution not found in the table');
    }
    let { testNumber, executionTime, memory, verdictName } = contextRow;
    let verdictId = getVerdictId(verdictName);
    return {
      id: getVerdictId(verdictName),
      isTerminal: isTerminal(verdictName),
      name: verdictId === 1 ? 'OK' : verdictName,
      testNumber: verdictId === 1 ? 0 : testNumber,
      executionTime,
      memory
    }
  });
}

function getEndpoint(pathTo = '') {
  return `${ACM_PROTOCOL}://${ACM_HOST}${pathTo}`;
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

function sanitizeVerdict(verdictName = '') {
  let clearVerdictRegExp = /(\s\(.*\))$/i;
  return verdictName.trim().replace(clearVerdictRegExp, '');
}