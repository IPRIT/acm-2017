import cheerio from 'cheerio';
import request from 'request-promise';
import { extractParam } from "../../utils/utils";
import * as models from '../../models';
import Promise from 'bluebird';

const ACM_PROTOCOL = 'https';
const ACM_HOST = 'acm.timus.ru';
const ACM_SOLUTIONS_POST_ENDPOINT = '/submit.aspx?space=1';

export async function sendSolution(solution, systemAccount) {
  return Promise.resolve().then(async () => {
    let endpoint = getEndpoint(ACM_SOLUTIONS_POST_ENDPOINT);
    let body = await request({
      method: 'POST',
      uri: endpoint,
      form: buildBody(solution, systemAccount),
      simple: false
    }).then(_ => {
      return Promise.delay(1000);
    }).then(_ => {
      return request({
        method: 'GET',
        uri: getEndpoint('/status.aspx'),
        simple: false,
        followAllRedirects: false
      });
    });
    
    let $ = cheerio.load(body);
    let rows = [];
    $('table.status').find('tr').slice(1).each((index, row) => {
      let $row = $(row);
      let accountId = extractParam($row.find('.coder a').attr('href'), 'id'),
        nickname = $row.find('.coder a').text(),
        problemIdentifier = extractParam($row.find('.problem a').attr('href'), 'num'),
        solutionId = $row.find('.id').text();
      rows.push({
        accountId,
        nickname,
        problemIdentifier,
        solutionId
      });
    });
    let contextRow;
    for (let row of rows) {
      if (row.nickname === systemAccount.instance.systemNickname) {
        let existSolution = await models.Solution.findOne({
          where: {
            internalSolutionIdentifier: `${systemAccount.instance.systemType}${row.solutionId}`
          }
        });
        if (existSolution) {
          throw new Error('Solution did not send');
        }
        systemAccount.foreignAccountId = row.accountId;
        contextRow = row;
        break;
      }
    }
    if (!contextRow) {
      throw new Error('Solution did not send');
    }
    await solution.update({
      internalSolutionIdentifier: `${systemAccount.instance.systemType}${contextRow.solutionId}`
    });
    return contextRow;
  });
}

function getEndpoint(pathTo = '') {
  return `${ACM_PROTOCOL}://${ACM_HOST}${pathTo}`;
}

function buildBody(solution, systemAccount) {
  return {
    'Action': 'submit',
    'SpaceID': '1',
    'Language': solution.Language.foreignLanguageId,
    'JudgeID': systemAccount.instance.systemLogin,
    'ProblemNum': solution.Problem.foreignProblemIdentifier,
    'Source': solution.sourceCode
  };
}
