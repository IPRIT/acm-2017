import request from 'request-promise';
import Promise from 'bluebird';
import { getEndpoint } from "../../utils/utils";
import {
  YANDEX_AUTH_PATH, YANDEX_PROTOCOL, YANDEX_CONTEST_HOST
} from "./yandex";
import * as yandex from './index';

export async function login(systemAccount) {
  return Promise.resolve().then(async () => {
    const $loginFailedException = new Error('Login failed');

    let jar = request.jar();
    Object.assign(systemAccount, { jar });
    let authEndpoint = getEndpoint(YANDEX_CONTEST_HOST, YANDEX_AUTH_PATH, {}, {
      retpath: '/'
    }, YANDEX_PROTOCOL);

    let $ = await yandex.$getPage(authEndpoint, systemAccount);
    let sk = $('[name=sk]').val();
    let form = buildAuthForm(sk, systemAccount);

    let response = await request({
      method: 'POST',
      uri: authEndpoint,
      form,
      simple: false,
      resolveWithFullResponse: true,
      followAllRedirects: true,
      encoding: 'utf8',
      jar
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

function buildAuthForm(sk, systemAccount) {
  let { systemLogin, systemPassword } = systemAccount.instance;
  return {
    login: systemLogin,
    password: systemPassword,
    sk,
    retpath: `${YANDEX_PROTOCOL}://${YANDEX_CONTEST_HOST}`,
  };
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
    return body.includes( instance.systemNickname );
  });
}