import request from 'request-promise';
import cheerio from 'cheerio';
import * as yandex from "./index";
import { getEndpoint } from "../../utils/utils";

export async function enterContest(contestNumber, systemAccount) {
  let $contestMainPage = await getContestMainPage(contestNumber, systemAccount);
  if (hasRegisterForm($contestMainPage)) {
    let $registerForm = getRegisterForm($contestMainPage);
    let form = getFormObject( $registerForm );
    $contestMainPage = await submitForm(form, yandex.YANDEX_CONTEST_ENTER, { contestNumber }, {}, systemAccount);
  }
  if (hasVirtualForm($contestMainPage)) {
    let $virtualForm = getVirtualForm($contestMainPage);
    let form = getFormObject( $virtualForm );
    await submitForm(form, yandex.YANDEX_CONTEST_ENTER, { contestNumber }, {}, systemAccount);
  }

  // checking new forms
  $contestMainPage = await getContestMainPage(contestNumber, systemAccount);
  if (hasForm($contestMainPage)) {
    throw new Error('Something went wrong');
  }
  return contestNumber;
}

async function getContestMainPage(contestNumber, systemAccount) {
  let endpoint = getEndpoint(yandex.YANDEX_CONTEST_HOST, yandex.YANDEX_CONTEST_ENTER, { contestNumber }, {}, yandex.YANDEX_PROTOCOL);
  let { jar } = systemAccount;

  let response = await request({
    method: 'GET',
    uri: endpoint,
    simple: false,
    resolveWithFullResponse: true,
    followAllRedirects: true,
    jar
  });
  if (!response.body || ![ 200, 302 ].includes(response.statusCode)) {
    throw new Error('Server is not available');
  }
  return cheerio.load( response.body );
}

function hasForm($) {
  let form = $('.content__info form');
  return form.length > 0;
}

function hasRegisterForm($) {
  if (!hasForm($)) {
    return false;
  }
  return $('.content__info form input[value=register]').length > 0;
}

function hasVirtualForm($) {
  if (!hasForm($)) {
    return false;
  }
  return $('.content__info form input[value=startVirtual]').length > 0;
}

function isRegisterForm($form) {
  return $form.find('input[value=register]').length > 0;
}

function isVirtualForm($form) {
  return $form.find('input[value=startVirtual]').length > 0;
}

function getForms($) {
  return $('.content__info form');
}

function getRegisterForm($) {
  let forms = Array.from(getForms($));
  let registerForm = forms.filter(form => {
    let $form = $(form);
    return isRegisterForm($form);
  });
  return $( registerForm[0] );
}

function getVirtualForm($) {
  let forms = Array.from(getForms($));
  let virtualForm = forms.filter(form => {
    let $form = $(form);
    return isVirtualForm($form);
  });
  return $( virtualForm[0] );
}

function getFormObject($form) {
  let form = {};
  Array.from($form.find('input')).forEach(input => {
    form[ input.attribs.name ] = input.attribs.value;
  });
  return form;
}

async function submitForm(form = {}, pathTo, params, qs, systemAccount) {
  let authEndpoint = getEndpoint(yandex.YANDEX_CONTEST_HOST, pathTo, params, qs, yandex.YANDEX_PROTOCOL);
  let { jar } = systemAccount;

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
    throw new Error('Service Unavailable');
  }
  return cheerio.load( response.body );
}