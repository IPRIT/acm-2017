import * as models from "../../../models";
import Promise from 'bluebird';
import userGroups from './../../../models/User/userGroups';
import * as socket from '../../../socket';
import { extractAllParams } from "../../../utils/utils";
import * as scanMethods from "./scanMethods/timus";

export function scanRequest(req, res, next) {
  return Promise.resolve().then(() => {
    return scan( extractAllParams(req) );
  }).then(result => res.json(result)).catch(next);
}

const availableMethods = {
  timus: scanMethods.scanTimus
};

export async function scan(params) {
  let {
    systemType
  } = params;

  socket.emitScannerConsoleLog('[Система] Сканирование...');

  if (systemType in availableMethods) {
    availableMethods[ systemType ](params);
  }

  return params;
}