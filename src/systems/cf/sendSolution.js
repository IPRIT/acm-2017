import cheerio from 'cheerio';
import request from 'request-promise';
import * as models from '../../models';
import * as accountsMethods from './account';
import Promise from 'bluebird';
import * as api from './api';
import { parseProblemIdentifier } from "../../utils/utils";

const ACM_PROTOCOL = 'http';
const ACM_HOST = 'codeforces.com';
const ACM_SOLUTIONS_POST_ENDPOINT = '/submit';

export async function sendSolution(solution, systemAccount) {
  return Promise.resolve().then(async () => {
    try {
      await authVerify( systemAccount );
      console.log(`[System report] Codeforces account [${systemAccount.instance.systemLogin}] verified.`);
    } catch (err) {
      console.log(`[System report] Refreshing Codeforces account [${systemAccount.instance.systemLogin}]...`);
      await accountsMethods.login( systemAccount );
    }
    
    let { csrfToken, jar } = systemAccount;
    let { type, contestNumber, symbolIndex } = parseProblemIdentifier(solution.Problem.foreignProblemIdentifier);
  
    let endpoint = getContestEndpoint(type, { contestNumber, pathTo: ACM_SOLUTIONS_POST_ENDPOINT });
    let solutionForm = buildSolutionForm(solution, systemAccount);
    
    let response = await request({
      method: 'POST',
      uri: endpoint,
      qs: {
        csrf_token: csrfToken
      },
      form: solutionForm,
      resolveWithFullResponse: true,
      followAllRedirects: true,
      jar,
      headers: {
        'Accept-Language': 'ru,en;q=0.8',
        'Cache-Control': 'max-age=0',
        'Host': 'codeforces.com',
        'Origin': 'http://codeforces.com',
        'User-Agent': 'Mozilla/6.0 (Windows NT 11.0; WOW64) AppleWebKit/737.36 (KHTML, like Gecko) Chrome/65.0.2403.157 YaBrowser/43.9.2403.3043 Safari/737.36'
      }
    });
    if (!response.body || ![ 200, 302 ].includes( response.statusCode )) {
      throw new Error('Service unavailable');
    } else {
      let $ = cheerio.load(response.body),
        submitForm = $('.submit-form'),
        submitErrorRepeat = $('.error.for__source');
      if (submitForm.length || submitErrorRepeat.length) {
        let errorTextForSameSolutions = 'Ранее вы отсылали абсолютно такой же код';
        if (submitErrorRepeat.text().includes( errorTextForSameSolutions )) {
          throw new Error('Same solution');
        }
        let roundbox = $('.submit-form .roundbox');
        if (roundbox.length) {
          throw new Error('Warning');
        }
        let errorTextForTooMuchSolutions = 'Вы можете отсылать решения не более 20 раз в 5 минут';
        if (submitErrorRepeat.text().includes( errorTextForTooMuchSolutions )) {
          throw new Error('Too much solutions');
        }
        console.log(response.body);
        throw new Error('Unhandled error');
      }
    }
    console.log(`[System report] Solution [${solution.id}] has been sent`);
    
    let contextRow = await getContextRow(solution, systemAccount);
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

function buildSolutionForm(solution, systemAccount) {
  let { csrfToken } = systemAccount;
  let baseFormData = {
    csrf_token: csrfToken,
    action: 'submitSolutionFormSubmitted',
    programTypeId: solution.Language.foreignLanguageId,
    source: solution.sourceCode,
    sourceFile: ''
  };
  let { type, contestNumber, symbolIndex } = parseProblemIdentifier(solution.Problem.foreignProblemIdentifier);
  if (type === 'gym') {
    Object.assign(baseFormData, {
      submittedProblemIndex: symbolIndex
    });
  } else if (type === 'problemset') {
    Object.assign(baseFormData, {
      submittedProblemCode: contestNumber + symbolIndex
    });
  }
  return baseFormData;
}

async function authVerify(systemAccount) {
  let isAuth = await accountsMethods.isAuth( systemAccount );
  if (!isAuth) {
    throw new Error('Account is not logged in');
  }
}

function getContestEndpoint(type = 'problemset', params = {}) {
  let { pathTo } = params;
  if (type === 'problemset') {
    return getEndpoint(`/problemset${pathTo}`);
  } else if (type === 'gym') {
    let { contestNumber } = params;
    return getEndpoint(`/gym/${contestNumber}${pathTo}`);
  }
}

async function getContextRow(solution, systemAccount) {
  let { type, contestNumber, symbolIndex } = parseProblemIdentifier(solution.Problem.foreignProblemIdentifier);
  let userStatus, found = false,
    attemptsNumber = 0, maxAttemptsNumber = 10;
  
  while ((!userStatus || !found) && attemptsNumber < maxAttemptsNumber) {
    await Promise.delay(1000 + attemptsNumber * 500);
    attemptsNumber++;
    console.log(`Attempt number: ${attemptsNumber}`);
    userStatus = await api.getUserStatus({
      handle: systemAccount.instance.systemLogin,
      count: 1,
      from: 1
    });
    let { result } = userStatus;
    let contextRow = (result || []).filter(row => {
      let { contestId, problem, author } = row;
      let isSolutionOwner = author.members.findIndex(member => {
        return member.handle === systemAccount.instance.systemLogin
      }) >= 0;
      return contestId === contestNumber
        && problem.index === symbolIndex
        && isSolutionOwner;
    }).map(row => {
      return {
        solutionId: row.id,
        handle: systemAccount.instance.systemLogin,
        problemIdentifier: { type, contestNumber, symbolIndex }
      }
    });
    if (!contextRow.length) {
      continue;
    }
    contextRow = contextRow[0];
    let existSolution = await models.Solution.findOne({
      where: {
        internalSolutionIdentifier: `${systemAccount.instance.systemType}${contextRow.solutionId}`
      }
    });
    if (!existSolution) {
      return contextRow;
    }
  }
  return null;
}