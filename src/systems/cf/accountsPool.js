import Promise from 'bluebird';
import * as models from '../../models';
import * as accountsMethods from './account';

const systemType = 'cf';
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
    });
    let { failed, success } = await tryLogin(systemAccounts);
    if (success.length > 0) {
      isInitialized = true;
      isInitializing = false;
      console.log(
        `[System report] ` +
        `${success.length !== systemAccounts.length ? 'Some' : 'All' }` +
        ` codeforces accounts [${success.map(x => x.instance.systemLogin).join(', ')}] have been initialized`
      );
    }
    if (failed.length > 0) {
      // run worker
      tryLoginUntilDone(failed, { repeat: 50, delay: 2000 });
    }
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

export async function tryLogin( accounts ) {
  console.log(
    `[System report [CF]] ` +
    `Trying to login [${accounts.map(x => x.instance.systemLogin).join(', ')}]`
  );
  let result = {
    success: [],
    failed: []
  };
  let promises = [];
  for (let account of accounts) {
    let loginPromise = accountsMethods.login(account).then(account => {
      result.success.push( account );
    }).catch(() => {
      result.failed.push( account );
    });
    promises.push( loginPromise );
  }
  return Promise.all( promises ).then(_ => result);
}

export async function tryLoginUntilDone( accounts, { repeat = Infinity, delay = 1000 } = {} ) {
  let result = {};
  do {
    await Promise.resolve().delay( delay );
    result = await tryLogin( accounts );
    if (result.success.length > 0) {
      isInitialized = true;
      isInitializing = false;
      console.log(
        `[System report] ` +
        `${result.failed.length > 0 ? 'Some' : 'All' }` +
        ` codeforces accounts [${result.success.map(x => x.instance.systemLogin).join(', ')}] have been initialized`
      );
      accounts = result.failed;
    }
    repeat--;
  } while (result.failed.length > 0 && repeat >= 0);
}