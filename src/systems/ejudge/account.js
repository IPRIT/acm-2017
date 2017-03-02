import cheerio from 'cheerio';
import request from 'request-promise';
import Promise from 'bluebird';
import { config, extractParam } from '../../utils';

export async function login(solution, systemAccount) {
  return Promise.resolve().then(async () => {
    const $loginFailedException = new Error('Login failed');
    
    let authForm = buildAuthForm(solution, systemAccount);
    let authEndpoint = getEndpoint('/cgi-bin/new-judge');
    let jar = request.jar();
    let response = await request({
      method: 'POST',
      uri: authEndpoint,
      form: authForm,
      simple: false,
      resolveWithFullResponse: true,
      followAllRedirects: true,
      encoding: 'utf8',
      jar
    });
    if (!response.body || ![ 200 ].includes( response.statusCode )) {
      throw new Error('Service Unavailable');
    }
    
    let path = response.request && response.request.path;
    if (!path || !/(sid\=)/i.test(path)) {
      throw $loginFailedException;
    }
    let sid = extractParam(path, 'SID');
    return Object.assign(systemAccount, {
      lastLoginAtMs: Date.now(),
      jar, sid
    });
  });
}

function getEndpoint(pathTo = '') {
  let { host, protocol } = config.ejudge;
  return `${protocol}://${host}${pathTo}`;
}

function buildAuthForm(solution, systemAccount) {
  let { systemLogin, systemPassword } = systemAccount.instance;
  let problemIdentifier = solution.Problem.foreignProblemIdentifier;
  let [ contestId, problemNumber ] = parseProblemIdentifier(problemIdentifier);
  return {
    login: systemLogin,
    password: systemPassword,
    contest_id: contestId,
    role: 5,
    locale_id: 0,
    action_2: 'Submit'
  };
}

export function parseProblemIdentifier(problemIdentifier) {
  return (problemIdentifier || '').split(':').map(Number);
}