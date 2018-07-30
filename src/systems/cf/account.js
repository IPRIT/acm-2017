import cheerio from 'cheerio';
import request from 'request-promise';
import Promise from 'bluebird';
import util from 'util';
import { Error as ErrorReporter } from '../../models';

const ACM_PROTOCOL = 'http';
const ACM_HOST = 'codeforces.com';
const ACM_AUTH_ENDPOINT = '/enter';

export async function login(systemAccount) {
  return Promise.resolve().then(async () => {
    let csrfEndpoint = getEndpoint();
    let jar = request.jar();
    let response = await request({
      method: 'GET',
      uri: csrfEndpoint,
      simple: false,
      resolveWithFullResponse: true,
      followAllRedirects: true,
      jar
    });
    if (!response.body || ![ 200, 302 ].includes( response.statusCode )) {
      throw new Error('Service unavailable');
    }
    
    const $loginFailedException = new Error('Login failed');
  
    let $ = cheerio.load(response.body);
    let csrfToken = $('meta[name=X-Csrf-Token]').attr('content');
  
    if (!csrfToken) {
      await ErrorReporter.create({
        errorTrace: 'No CSRF token provided'
      });
      throw $loginFailedException;
    }
    
    let authForm = buildAuthForm(csrfToken, systemAccount);
    let authEndpoint = getEndpoint(ACM_AUTH_ENDPOINT);
    response = await request({
      method: 'POST',
      uri: authEndpoint,
      form: authForm,
      simple: false,
      resolveWithFullResponse: true,
      followAllRedirects: true,
      encoding: 'utf8',
      jar,
      headers: {
        'Host': 'codeforces.com',
        'Connection': 'keep-alive',
        'Origin': 'http://codeforces.com',
        'User-Agent': 'Mozilla/7.0 (Windows NT 11.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/62.0.2403.157 YaBrowser/41.9.2403.3043 Safari/734.21',
        'Content-Type': 'application/x-www-form-urlencoded; utf-8',
        'Accept': '*/*',
        'Accept-Language': 'ru,en;q=0.8'
      }
    });
  
    if (!response.body || ![ 200 ].includes( response.statusCode )) {
      console.log(response.statusCode, response.body);
      /*await ErrorReporter.create({
        errorTrace: util.inspect(response, false, null)
      });*/
      throw $loginFailedException;
    }
  
    $ = cheerio.load(response.body);
    csrfToken = $('meta[name=X-Csrf-Token]').attr('content');
    
    return Object.assign(systemAccount, {
      lastLoginAtMs: Date.now(),
      csrfToken,
      jar
    });
  });
}

function getEndpoint(pathTo = '') {
  return `${ACM_PROTOCOL}://${ACM_HOST}${pathTo}`;
}

function buildAuthForm(csrfToken, systemAccount) {
  let { systemLogin, systemPassword } = systemAccount.instance;
  return {
    csrf_token: csrfToken,
    action: 'enter',
    handleOrEmail: systemLogin,
    password: systemPassword
  };
}

export function isAuth(systemAccount) {
  return Promise.resolve().then(async () => {
    let { jar } = systemAccount;
    let response = await request({
      method: 'GET',
      uri: getEndpoint(),
      simple: false,
      resolveWithFullResponse: true,
      followAllRedirects: true,
      jar
    });
    if (!response.body || ![ 200, 302 ].includes(response.statusCode)) {
      throw new Error('Service unavailable');
    }
    let $ = cheerio.load(response.body);
    let accountLink = $(`#header a[href="/profile/${systemAccount.instance.systemLogin}"]`);
    return accountLink.length > 0;
  });
}