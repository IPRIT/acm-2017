import * as yandex from './yandex';
import * as models from '../models';
import express from 'express';
import formData from 'express-form-data';
import Promise from 'bluebird';
import * as socket from '../socket';

const router = express.Router();

router.use(formData.parse());
router.use(formData.stream());
router.use(formData.union());

router.get('/', test);
router.post('/', test);

async function test(req, res, next) {
  return Promise.resolve().then(() => {
    return _test(req, res);
  }).then(result => res.json(result)).catch(next);
}

async function _test(req, res) {
  let fileStream = req.stream.file;
  let account = await yandex.getFreeAccount();
  account.busy();

  // we can run these operations in background
  // cause we have socket.io console
  /*yandex.importFromPolygon(fileStream, account).then(importId => {
    return yandex.observeImportUntilDone(importId, account);
  })*/
  Promise.resolve(560).then(contestId => {
    return yandex.enterContest(contestId, account);
  })/*.then(contestId => {
    return yandex.importLanguages(contestId, account);
  })*/.then(contestId => {
    return yandex.importProblems(contestId, account);
  }).then(_ => {
    socket.emitScannerConsoleLog( yandex.buildConsoleMessage(`Импортирование полностью завершено.`) );
  }).catch(err => {
    socket.emitScannerConsoleLog( yandex.buildConsoleMessage(`Ошибка при импортировании: ${err.message}`) );
  }).finally(() => {
    account.free();
  });
  return { result: 'ok' };
}

export default router;