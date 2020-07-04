import Promise from 'bluebird';
import cheerio from 'cheerio';
import request from 'request-promise';
import stringToStream from 'string-to-stream';
import * as models from '../../models';
import { login, parseProblemIdentifier } from "./account";
import { getSymbolIndex } from "../../utils";

const ACM_SOLUTIONS_ENDPOINT = '/cgi-bin/new-judge';

export async function sendSolution(solution, systemAccount) {
  return Promise.resolve().then(async () => {
    await login(solution, systemAccount);
    await Promise.delay(1000);
    
    let endpoint = getEndpoint(ACM_SOLUTIONS_ENDPOINT);
    let { sid, jar } = systemAccount;
    
    let response = await request({
      method: 'POST',
      uri: endpoint,
      formData: buildPostForm(solution, systemAccount),
      simple: false,
      resolveWithFullResponse: true,
      followAllRedirects: true,
      encoding: 'utf8',
      jar
    });
    if (!response.body || ![ 200 ].includes(response.statusCode)) {
      throw new Error('Service Unavailable');
    }
    
    await Promise.delay(500);
    endpoint = getEndpoint(ACM_SOLUTIONS_ENDPOINT);
    response = await request({
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
    let [ contestId, problemNumber ] = parseProblemIdentifier(solution.Problem.foreignProblemIdentifier);
    let rows = [];
    $('table.b1').find('tr').slice(1).each((index, row) => {
      let $row = $(row);
      let sentIdDirty = $row.find('td').eq(0).text();
      let probablySolutionId;
      try {
        probablySolutionId = Number(sentIdDirty.match(/(\d+)/i)[1]);
      } catch (error) {
        return;
      }
      let username = $row.find('td').eq(2).text().trim();
      let symbolIndex = $row.find('td').eq(3).text().trim().toLowerCase();
      rows.push({
        solutionId: getEjudgeSolutionId(contestId, probablySolutionId),
        username,
        symbolIndex
      });
    });
    
    let contextRow;
    for (let row of rows) {
      if (row.symbolIndex === getSymbolIndex(problemNumber - 1)
        || row.username.toLowerCase() === systemAccount.instance.systemLogin.trim().toLowerCase()) {
        let existSolution = await models.Solution.findOne({
          where: {
            internalSolutionIdentifier: row.solutionId
          }
        });
        if (existSolution) {
          throw new Error('Solution did not send');
        }
        contextRow = row;
        break;
      }
    }
    if (!contextRow) {
      throw new Error('Solution did not send');
    }
    await solution.update({
      internalSolutionIdentifier: contextRow.solutionId
    });
    return contextRow;
  });
}

function getEndpoint(pathTo = '') {
  let { host, protocol } = config.ejudge;
  return `${protocol}://${host}${pathTo}`;
}

function buildPostForm(solution, systemAccount) {
  let { sid } = systemAccount;
  let [ contestId, problemNumber ] = parseProblemIdentifier(solution.Problem.foreignProblemIdentifier);
  return {
    'SID': sid,
    'problem': problemNumber,
    'lang_id': solution.Language.foreignLanguageId,
    'file': {
      value: stringToStream(solution.sourceCode),
      options: {
        filename: 'source.txt',
        contentType: 'text/plain',
        knownLength: solution.sourceCode.length
      }
    },
    'action_40': 'Send!'
  };
}

export function getEjudgeSolutionId(...args) {
  return `ejudge${args.join('_')}`;
}