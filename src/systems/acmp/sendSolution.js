import cheerio from 'cheerio';
import querystring from 'querystring';
import request from 'request-promise';
import { extractParam } from "../../utils/utils";
import * as models from '../../models';
import * as accountsMethods from './account';
import Promise from 'bluebird';
import { ensureNumber } from "../../utils/utils";

const ACM_PROTOCOL = 'https';
const ACM_HOST = 'acmp.ru';
const ACM_SOLUTIONS_POST_ENDPOINT = '/';

export async function sendSolution(solution, systemAccount) {
  return Promise.resolve().then(async () => {
    try {
      await authVerify(systemAccount);
      console.log(`[System report] ACMP account [${systemAccount.instance.systemLogin}] verified.`);
    } catch (err) {
      console.log(`[System report] Refreshing ACMP account [${systemAccount.instance.systemLogin}]...`);
      await accountsMethods.login(systemAccount);
    }
  
    let endpoint = getEndpoint(ACM_SOLUTIONS_POST_ENDPOINT, {
      main: 'update',
      mode: 'upload',
      id_task: solution.Problem.foreignProblemIdentifier
    });
    let { jar } = systemAccount;
    await request({
      method: 'POST',
      uri: endpoint,
      formData: buildBody(solution, systemAccount),
      resolveWithFullResponse: true,
      followAllRedirects: true,
      jar
    });
    
    let contextRow = await getContextRow(systemAccount);
    if (!contextRow) {
      throw new Error('Solution did not send');
    }
    await solution.update({
      internalSolutionIdentifier: `${systemAccount.instance.systemType}${contextRow.solutionId}`
    });
    return contextRow;
  });
}

function getEndpoint(pathTo = '', searchParams = {}) {
  const searchParamsNotEmpty = Object.keys(searchParams).length;
  return `${ACM_PROTOCOL}://${ACM_HOST}${pathTo}${searchParamsNotEmpty ?
  '?' + querystring.stringify(searchParams) : ''}`;
}

function buildBody(solution, systemAccount) {
  return {
    lang: solution.Language.foreignLanguageId,
    source: solution.sourceCode,
    fname: ''
  };
}

async function authVerify(systemAccount) {
  let { jar } = systemAccount;
  let foreignAccountId = await accountsMethods.getForeignAccountId( jar );
  if (!foreignAccountId) {
    throw new Error('Account is not logged in');
  }
}

async function getContextRow(systemAccount) {
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
  
  const $ = cheerio.load(body);
  
  let rows = [];
  $('.white,.gray').each((index, row) => {
    let $row = $(row);
    let tds = $row.find('td');
    let accountId = ensureNumber( extractParam(tds.eq(2).find('a').attr('href'), 'id') ),
      problemIdentifier = extractParam(tds.eq(3).find('a').attr('href'), 'id_task'),
      solutionId = ensureNumber(tds.eq(0).text());
    rows.push({
      accountId,
      problemIdentifier,
      solutionId
    });
  });
  
  for (let row of rows) {
    if (row.accountId == systemAccount.foreignAccountId) {
      let existSolution = await models.Solution.findOne({
        where: {
          internalSolutionIdentifier: `${systemAccount.instance.systemType}${row.solutionId}`
        }
      });
      if (existSolution) {
        throw new Error('Solution did not send');
      }
      return row;
    }
  }
}