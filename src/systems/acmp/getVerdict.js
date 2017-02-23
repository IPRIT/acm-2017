import cheerio from 'cheerio';
import querystring from 'querystring';
import url from 'url';
import request from 'request-promise';
import { extractParam, ensureNumber } from "../../utils/utils";
import * as models from '../../models';
import Promise from 'bluebird';

const ACM_PROTOCOL = 'http';
const ACM_HOST = 'acmp.ru';


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
  return Promise.resolve().then(async () => {
    let endpoint = getEndpoint('/index.asp');
    let { jar } = systemAccount;
    let body = await request({
      method: 'GET',
      uri: endpoint,
      qs: {
        main: 'status',
        id_mem: systemAccount.foreignAccountId
      },
      simple: false,
      followAllRedirects: true,
      jar
    });
  
    var $ = cheerio.load(body);
  
    let rows = [];
    $('.white,.gray').each((index, row) => {
      let $row = $(row);
      let tds = $row.find('td');
      let accountId = ensureNumber( extractParam(tds.eq(2).find('a').attr('href'), 'id') ),
        verdictName = sanitizeVerdict(tds.eq(5).text()),
        problemIdentifier = extractParam(tds.eq(3).find('a').attr('href'), 'id_task'),
        solutionId = ensureNumber(tds.eq(0).text()),
        testNumber = ensureNumber(tds.eq(6).text().trim()),
        executionTime = ensureNumber(tds.eq(7).text().trim().replace(',', '.')),
        memory = ensureNumber(tds.eq(8).text().replace(/[^0-9]/gi, ''));
      rows.push({
        accountId,
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
      if (row.accountId == systemAccount.foreignAccountId
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
      testNumber,
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