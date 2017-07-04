import Promise from 'bluebird';
import * as models from '../../models';
import * as accountsMethods from './account';

const systemType = 'yandexOfficial';
const accountTimeoutMs = 10 * 1000;

let systemAccounts = [];
let isInitialized = false;
let isInitializing = false;

function _initialize() {
  isInitializing = true;
  return Promise.resolve().then(async () => {
    systemAccounts = await models.SystemAccount.findAll({
      where: {
        systemType,
        isEnabled: true
      }
    }).map(account => {
      return _wrapAccount(account);
    }).map(account => {
      return accountsMethods.login(account);
    });
    isInitialized = true;
    isInitializing = false;
    console.log('[System report] Yandex Official accounts have been initialized');
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
  if (!isInitialized && !isInitializing) {
    await _initialize();
  }
  let freeSystemAccounts = await getFreeAccounts();
  if (!freeSystemAccounts.length) {
    throw new Error('No free system accounts');
  }
  return freeSystemAccounts.shift();
}

export async function getSomeAccount() {
  if (!isInitialized && !isInitializing) {
    await _initialize();
  }
  if (!systemAccounts.length) {
    throw new Error('No free system accounts');
  }
  return systemAccounts[0];
}

export async function getFreeAccounts() {
  if (!isInitialized && !isInitializing) {
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