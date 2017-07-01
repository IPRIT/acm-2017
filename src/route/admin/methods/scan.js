import Promise from 'bluebird';
import * as socket from '../../../socket';
import { extractAllParams } from "../../../utils/utils";
import * as scanMethods from "./scanMethods";

export function scanRequest(req, res, next) {
  return Promise.resolve().then(() => {
    res.json( extractAllParams(req) );
    return scan( extractAllParams(req) )
      .catch((err) => {
        socket.emitScannerConsoleLog(`error: ${err.message}`);
      });
  }).catch(next);
}

const availableMethods = {
  timus: scanMethods.scanTimus,
  cf: scanMethods.scanCf
};

export async function scan(params) {
  let {
    systemType
  } = params;

  socket.emitScannerConsoleLog('[Система] Сканирование...');

  if (systemType in availableMethods) {
    availableMethods[ systemType ](params);
  } else {
    console.error( new Error('Foreign system not found') );
  }

  return params;
}