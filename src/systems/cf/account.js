import cheerio from 'cheerio';
import querystring from 'querystring';
import url from 'url';
import request from 'request-promise';
import { extractParam } from "../../utils/utils";
import * as models from '../../models';
import Promise from 'bluebird';

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
        'User-Agent': 'Mozilla/6.0 (Windows NT 11.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/55.0.2403.157 YaBrowser/21.9.2403.3043 Safari/537.36',
        'Content-Type': 'application/x-www-form-urlencoded; utf-8',
        'Accept': '*/*',
        'Accept-Language': 'ru,en;q=0.8'
      }
    });
  
    if (!response.body || ![ 200 ].includes( response.statusCode )) {
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

function getEndpoint(pathTo = '', searchParams = {}) {
  const searchParamsNotEmpty = Object.keys(searchParams).length;
  return `${ACM_PROTOCOL}://${ACM_HOST}${pathTo}${searchParamsNotEmpty ?
  '?' + querystring.stringify(searchParams) : ''}`;
}

function buildAuthForm(csrfToken, systemAccount) {
  let { systemLogin, systemPassword } = systemAccount.instance;
  return {
    csrf_token: csrfToken,
    action: 'enter',
    handle: systemLogin,
    password: systemPassword
  };
}