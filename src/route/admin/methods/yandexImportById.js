import * as yandex from '../../../systems/yandex';
import Promise from 'bluebird';
import * as socket from '../../../socket';
import { extractAllParams } from "../../../utils/utils";

export function yandexImportByIdRequest(req, res, next) {
  return Promise.resolve().then(() => {
    return yandexImportById(
      extractAllParams(req)
    );
  }).then(result => res.json(result)).catch(next);
}

export async function yandexImportById(params) {
  let { contestId } = params;
  let account;
  // we can run these operations in background
  // cause we have socket.io console
  yandex.getFreeAccount().then(_account => {
    account = _account;
    account.busy();
    return yandex.enterContest(contestId, account);
  }).then(contestId => {
    return yandex.importLanguages(contestId, account);
  }).then(contestId => {
    return yandex.importProblems(contestId, account);
  }).then(_ => {
    socket.emitYandexContestImportConsoleLog( yandex.buildConsoleMessage(`Импортирование полностью завершено.`) );
  }).catch(err => {
    socket.emitYandexContestImportConsoleLog( yandex.buildConsoleMessage(`Ошибка при импортировании: ${err.message}`) );
  }).finally(() => {
    account.free();
  });
  return { result: 'ok' };
}