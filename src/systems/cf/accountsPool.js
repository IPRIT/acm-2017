import Promise from 'bluebird';
import * as models from '../../models';

const systemType = 'timus';
const accountTimeoutMs = 15 * 1000;

let systemAccounts = [];
let isInitialized = false;

function _initialize() {
  return Promise.resolve().then(async () => {
    systemAccounts = await models.SystemAccount.findAll({
      where: {
        systemType,
        isEnabled: true
      }
    }).map(account => _wrapAccount(account));
    isInitialized = true;
  }).catch(console.error.bind(console));
}

function _wrapAccount(account) {
  return {
    instance: account,
    lastSentSolutionAtMs: 0,
    isBusy: false,
    foreignAccountId: null,
    busy() {
      this.isBusy = true;
      this.lastSentSolutionAtMs = Date.now();
    },
    free() {
      this.isBusy = false;
    }
  }
}

export async function getFreeAccount() {
  if (!isInitialized) {
    await _initialize();
  }
  let freeSystemAccounts = await getFreeAccounts();
  if (!freeSystemAccounts.length) {
    throw new Error('No free system accounts');
  }
  return freeSystemAccounts.shift();
}

export async function getFreeAccounts() {
  if (!isInitialized) {
    await _initialize();
  }
  return systemAccounts.filter(account => {
    return !account.isBusy && account.lastSentSolutionAtMs + accountTimeoutMs < Date.now()
  });
}

export async function getFreeAccountsNumber() {
  let freeAccounts = await getFreeAccounts();
  return freeAccounts.length;
}