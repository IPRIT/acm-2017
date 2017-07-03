import cheerio from 'cheerio';
import request from 'request-promise';
import Promise from 'bluebird';
import { getEndpoint } from "../../utils/utils";
import {
  YANDEX_PASSPORT_HOST, YANDEX_AUTH_PATH, YANDEX_PROTOCOL, YANDEX_CONTEST_HOST,
  YANDEX_ADMIN_CONTESTS_PATH
} from "./yandex";

export async function login(systemAccount) {
  return Promise.resolve().then(async () => {
    const $loginFailedException = new Error('Login failed');
    
    let authForm = buildAuthForm(systemAccount);
    let jar = request.jar();
    let authEndpoint = getEndpoint(YANDEX_PASSPORT_HOST, YANDEX_AUTH_PATH, {}, {
      twoweeks: 'yes',
      from: 'contest'
    }, YANDEX_PROTOCOL);

    let response = await request({
      method: 'POST',
      uri: authEndpoint,
      form: authForm,
      simple: false,
      resolveWithFullResponse: true,
      followAllRedirects: true,
      encoding: 'utf8',
      jar,
      headers: {
        'Host': 'passport.yandex.ru',
        'Connection': 'keep-alive',
        'Origin': 'https://contest.yandex.ru',
        'User-Agent': 'Mozilla/6.0 (Windows NT 11.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/67.0.2403.157 YaBrowser/45.9.2403.3043 Safari/737.36',
        'Content-Type': 'application/x-www-form-urlencoded; utf-8',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'ru,en;q=0.8'
      }
    });
  
    if (!response.body || ![ 200 ].includes( response.statusCode )) {
      throw $loginFailedException;
    }
    
    return Object.assign(systemAccount, {
      lastLoginAtMs: Date.now(),
      jar
    });
  });
}

function buildAuthForm(systemAccount) {
  let { systemLogin, systemPassword } = systemAccount.instance;
  return {
    login: systemLogin,
    passwd: systemPassword,
    timestamp: Date.now(),
    retpath: 'https://contest.yandex.ru',
  };
}

export async function getCsrfToken(systemAccount) {
  let { jar } = systemAccount;
  let endpoint = getEndpoint(YANDEX_CONTEST_HOST, YANDEX_ADMIN_CONTESTS_PATH, {}, {}, YANDEX_PROTOCOL);
  let response = await request({
    method: 'GET',
    uri: endpoint,
    simple: false,
    resolveWithFullResponse: true,
    followAllRedirects: true,
    jar
  });
  if (!response.body || ![ 200, 302 ].includes(response.statusCode)) {
    throw new Error('Service unavailable');
  }
  const $ = cheerio.load( response.body );
  let csrfInputs = $('[name=csrf-token]');
  if (!csrfInputs.length) {
    throw new Error('Csrf token not found');
  }
  return csrfInputs.eq(0).attr('value');
}

export function isAuth(systemAccount) {
  return Promise.resolve().then(async () => {
    let { jar, instance } = systemAccount;
    let endpoint = getEndpoint(YANDEX_CONTEST_HOST, '/', {}, {}, YANDEX_PROTOCOL);
    let response = await request({
      method: 'GET',
      uri: endpoint,
      simple: false,
      resolveWithFullResponse: true,
      followAllRedirects: true,
      jar
    });
    if (!response.body || ![ 200, 302 ].includes(response.statusCode)) {
      throw new Error('Service unavailable');
    }
    let { body = '' } = response;
    return body.includes( instance.systemLogin );
  });
}