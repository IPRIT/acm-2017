import { extractAllParams } from '../../../utils';
import * as models from "../../../models";
import Promise from 'bluebird';
import * as timus from '../../../systems/timus';
import * as cf from '../../../systems/cf';
import * as acmp from '../../../systems/acmp';
import * as ejudge from '../../../systems/ejudge';
import * as yandex from '../../../systems/yandex';
import * as yandexOfficial from '../../../systems/yandex.official';

const systems = {
  timus, cf, acmp,
  ejudge, yandex, yandexOfficial
};

export function getSystemStatusRequest(req, res, next) {
  return Promise.resolve().then(() => {
    return getSystemStatus(
      extractAllParams(req)
    );
  }).then(result => res.json(result)).catch(next);
}

export async function getSystemStatus(params) {
  let {
  } = params;

  return Promise.resolve(Object.keys(systems)).map(async type => {
    return {
      type,
      status: await fetchSystemStatus(type)
    }
  });
}

async function fetchSystemStatus( systemType ) {
  let system = systems[ systemType ];
  let freeAccounts = await system.getFreeAccounts();
  return {
    allAccounts: system.systemAccounts,
    allAccountsNumber: system.systemAccounts.length,
    freeAccounts,
    freeAccountsNumber: freeAccounts.length,
    busyAccounts: system.systemAccounts.filter(account => {
      return !freeAccounts.some(freeAccount => {
        return freeAccount.instance.id === account.instance.id;
      })
    }),
    busyAccountsNumber: system.systemAccounts.length - freeAccounts.length
  }
}