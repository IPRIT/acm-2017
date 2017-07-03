import { getEndpoint, ensureNumber, passwordHash, extractParam } from "../../utils/utils";
import * as socket from '../../socket';
import * as accountMethods from './account';
import request from 'request-promise';
import Promise from 'bluebird';
import cheerio from 'cheerio';
import {
  YANDEX_CONTEST_HOST, YANDEX_PROTOCOL, YANDEX_IMPORT_CONTEST_PATH,
  YANDEX_IMPORT_PROCESSING_PATH
} from "./yandex";

const consoleMessagePattern = '[{systemType}] {message}';
const SYSTEM_TYPE = 'yandex';

export async function importFromPolygon(fileStream, systemAccount) {
  socket.emitScannerConsoleLog(buildConsoleMessage(`Проверка пользователя...`));
  let isAuth = await accountMethods.isAuth(systemAccount);
  if (!isAuth) {
    socket.emitScannerConsoleLog(buildConsoleMessage(`Пользователь не залогинен. Повтор входа...`));
    await accountMethods.login(systemAccount);
  }

  socket.emitScannerConsoleLog(buildConsoleMessage(`Получение CSRF токена...`));
  let csrfToken = await accountMethods.getCsrfToken(systemAccount);
  socket.emitScannerConsoleLog(buildConsoleMessage(`Яндекс CSRF токен: ${csrfToken}`));
  let form = buildPostForm('polygon', fileStream, csrfToken);
  let endpoint = getEndpoint(YANDEX_CONTEST_HOST, YANDEX_IMPORT_CONTEST_PATH, {}, {}, YANDEX_PROTOCOL);
  let { jar } = systemAccount;

  socket.emitScannerConsoleLog(buildConsoleMessage(`Идет отправка архива...`));
  let response = await request({
    method: 'POST',
    uri: endpoint,
    formData: form,
    simple: false,
    resolveWithFullResponse: true,
    followAllRedirects: false,
    encoding: 'utf8',
    jar
  });
  let location = response.headers['location'];
  let importIdRegexp = /(\d+)$/i;
  if (!location || !importIdRegexp.test(location)) {
    throw new Error('Import id not found');
  }
  let importId = ensureNumber( location.match(importIdRegexp)[1] );
  socket.emitScannerConsoleLog(buildConsoleMessage(`Архив отправлен. Получен Import ID: ${importId}`));
  return importId;
}

export async function observeImportUntilDone(importId, systemAccount) {
  let endpoint = getEndpoint(YANDEX_CONTEST_HOST, YANDEX_IMPORT_PROCESSING_PATH, { importId }, {}, YANDEX_PROTOCOL);
  let { jar } = systemAccount;
  let isProcessDone = false;

  const processMaxTimeObservation = 20 * 60 * 1000;
  let startedAtMs = Date.now();

  let consoleLogHash = passwordHash(Math.random().toString());

  while (!isProcessDone && Date.now() - startedAtMs < processMaxTimeObservation) {
    let response = await request({
      method: 'GET',
      uri: endpoint,
      simple: false,
      resolveWithFullResponse: true,
      followAllRedirects: true,
      jar
    });
    if (!response.body || ![ 200, 302 ].includes(response.statusCode)) {
      await Promise.delay(3000);
      continue;
    }
    const $ = cheerio.load( response.body );
    let successAlert = $('.alert-success');
    if (successAlert.length) {
      let linkElement = successAlert.find('a.pull-right');
      let href = linkElement.attr('href');
      let contestId = ensureNumber( extractParam(href, 'contestId') );
      if (contestId) {
        isProcessDone = true;
        console.log('Contest ID:', contestId);
        socket.emitScannerConsoleLog(
          buildConsoleMessage(`Импорт завершен: <a target='_blank' href='https://contest.yandex.ru/admin/edit-contest?contestId=${contestId}'>Редактировать</a>`)
        );
        return contestId;
      }
    } else {
      let consoleRows = [];
      $('.table-condensed tr').each(function () {
        let $row = $(this);
        consoleRows.push(
          $row.find('td').eq(1).text()
        );
      });
      printRows(consoleRows, consoleLogHash);
    }
    await Promise.delay(300);
  }

  if (!isProcessDone) {
    throw new Error('Import failed');
  }
}

function buildPostForm(systemType = 'polygon', fileStream, csrfToken) {
  return {
    'type': systemType,
    'csrf-token': csrfToken,
    'contest-archive': {
      value: fileStream,
      options: {
        filename: 'contest-4684.zip',
        contentType: 'application/x-zip-compressed'
      }
    }
  };
}

export function buildConsoleMessage(message = '') {
  return consoleMessagePattern.replace('{systemType}', SYSTEM_TYPE)
    .replace('{message}', message);
}

let pointsNumber = 1;
function printRows(rows, hash) {
  let message = `
    **[Статус]** **Импорт. Подождите${'.'.repeat((pointsNumber++ % 3))}**
    
  `;
  for (let row of rows) {
    message += `${buildConsoleMessage(row)}
    `;
  }
  socket.emitScannerConsoleLog( message, hash );
}