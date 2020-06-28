import { extractAllParams } from '../../../utils';
import Promise from 'bluebird';
import {
  timus, cf, acmp,
  ejudge, yandex, yandexOfficial
} from '../../../systems';

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

  return Promise.resolve(Object.keys(systems)).map(async systemType => {
    if (!systemType) {
      return {};
    }
    return {
      type: systemType,
      status: await fetchSystemStatus(systemType)
    }
  });
}

async function fetchSystemStatus( systemType ) {
  let system = systems[ systemType ];
  let freeAccounts = await system.getFreeAccounts();
  const systemAccounts = system.systemAccounts;

  return {
    allAccounts: systemAccounts,
    allAccountsNumber: systemAccounts.length,
    freeAccounts,
    freeAccountsNumber: freeAccounts.length,
    busyAccounts: systemAccounts.filter(account => {
      return !freeAccounts.some(freeAccount => {
        return freeAccount.instance.id === account.instance.id;
      })
    }),
    busyAccountsNumber: systemAccounts.length - freeAccounts.length
  }
}