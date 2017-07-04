import * as yandex from './index';
import Promise from 'bluebird';
import * as sockets from '../../socket';
import filter from "../../utils/filter";
import * as models from '../../models';
import request from 'request-promise';
import cheerio from 'cheerio';

export const YANDEX_PROTOCOL = 'https';
export const YANDEX_CONTEST_HOST = 'official.contest.yandex.ru';

export const YANDEX_AUTH_PATH = '/login/';
export const YANDEX_ADMIN_CONTESTS_PATH = '/admin/contests';

export const YANDEX_CONTEST_PROBLEMS = '/contest/:contestNumber/problems';
export const YANDEX_CONTEST_SUBMITS = '/contest/:contestNumber/submits';
export const YANDEX_CONTEST_SUBMIT = '/contest/:contestNumber/submit/';
export const YANDEX_CONTEST_ENTER = '/contest/:contestNumber/enter/';
export const YANDEX_CONTEST_PROBLEM = '/contest/:contestNumber/problems/:symbolIndex';
export const YANDEX_CONTEST_RUN_REPORT = '/contest/:contestNumber/run-report/:solutionId/';

const maxAttemptsNumber = 3;
const nextAttemptAfterMs = 15 * 1000;
const serviceUnavailableVerdictId = 13;
const solutionWithWarningVerdictId = 18;
const verdictCheckTimeoutMs = 100;
const maxAccountWaitingMs = 2 * 60 * 1000;

const consoleMessagePattern = '[{systemType}] {message}';
const SYSTEM_TYPE = 'yandexOfficial';

export async function handle(solution) {
  let systemAccount = await yandex.getFreeAccount();
  systemAccount.busy();

  try {
    let contextRow = await yandex.sendSolution(solution, systemAccount);

    let verdict;
    while (!verdict || !verdict.isTerminal) {
      if (systemAccount.lastSentSolutionAtMs + maxAccountWaitingMs < Date.now()) {
        throw new Error('Time limit has exceeded');
      }
      verdict = await yandex.getVerdict(solution, systemAccount, contextRow);
      console.log(verdict);
      let socketData = {
        contestId: solution.contestId,
        solution: filter(Object.assign(solution.get({ plain: true }), { verdict }), {
          exclude: [ 'sourceCode' ]
        })
      };
      sockets.emitVerdictUpdateEvent(socketData);
      sockets.emitUserSolutionsEvent(solution.userId, 'verdict updated', socketData.solution);
      sockets.emitAdminSolutionsEvent('verdict updated', socketData.solution);
      await Promise.delay(verdictCheckTimeoutMs);
    }
    if (verdict && verdict.id === 3) {
      let compilationError = await yandex.getCompilationError(solution, systemAccount, contextRow);
      Object.assign(verdict, { compilationError });
    }
    return saveVerdict(solution, systemAccount, verdict);
  } catch (error) {
    await handleError(error, solution, systemAccount);
  }
}

export async function $getPage(endpoint, systemAccount) {
  let { jar } = systemAccount;

  let response = await request({
    method: 'GET',
    uri: endpoint,
    simple: false,
    resolveWithFullResponse: true,
    followAllRedirects: true,
    jar
  });
  if (!response.body || ![ 200, 302 ].includes(response.statusCode)) {
    throw new Error('Server is not available');
  }
  return cheerio.load( response.body );
}

async function handleError(error, solution, systemAccount) {
  console.log('handleError:', error);
  await models.Error.create({
    errorTrace: error && (error.stack || error.message || error.description || '')
  });
  let isAuth = await yandex.isAuth(systemAccount);
  if (!isAuth) {
    console.log(`[System report] Refreshing Yandex account [${systemAccount.instance.systemLogin}]...`);
    await yandex.login(systemAccount);
  }
  Promise.delay(10 * 1000).then(_ => systemAccount.free());

  let verdictId = getVerdictIdByError(error);
  if ([ solutionWithWarningVerdictId ].includes( verdictId )) {
    solution.retriesNumber = maxAttemptsNumber;
  } else {
    solution.retriesNumber++;
  }

  if (solution.retriesNumber >= maxAttemptsNumber) {
    let verdict = await models.Verdict.findByPrimary(serviceUnavailableVerdictId);
    await solution.update({
      retriesNumber: solution.retriesNumber,
      verdictId: verdict.id,
      verdictGotAtMs: Date.now(),
      errorTrace: (error || '').toString()
    });
    let socketData = {
      contestId: solution.contestId,
      solution: filter(Object.assign(solution.get({ plain: true }), {
        verdict: {
          id: verdict.id,
          isTerminal: true,
          name: verdict.name,
          testNumber: 0,
          executionTime: 0,
          memory: 0
        }
      }), {
        exclude: [ 'sourceCode' ]
      })
    };
    sockets.emitVerdictUpdateEvent(socketData);
    sockets.emitUserSolutionsEvent(solution.userId, 'verdict updated', socketData.solution);
    sockets.emitAdminSolutionsEvent('verdict updated', socketData.solution);
  } else {
    await solution.update({
      retriesNumber: solution.retriesNumber,
      nextAttemptWillBeAtMs: Date.now() + nextAttemptAfterMs * solution.retriesNumber
    });
    let socketData = {
      contestId: solution.contestId,
      solution: filter(Object.assign(solution.get({ plain: true }), {
        _currentAttempt: solution.retriesNumber
      }), {
        exclude: [ 'sourceCode' ]
      })
    };
    sockets.emitVerdictUpdateEvent(socketData);
    sockets.emitUserSolutionsEvent(solution.userId, 'verdict updated', socketData.solution);
    sockets.emitAdminSolutionsEvent('verdict updated', socketData.solution);
  }
}

function getVerdictIdByError(error) {
  if (!error || !error.message) {
    return serviceUnavailableVerdictId;
  } else if (error.message.includes( 'Solution has warning' )) {
    return solutionWithWarningVerdictId;
  } else {
    return serviceUnavailableVerdictId;
  }
}

async function saveVerdict(solution, systemAccount, verdict) {
  await solution.update({
    verdictGotAtMs: Date.now(),
    testNumber: verdict.testNumber,
    executionTime: verdict.executionTime,
    memory: verdict.memory,
    verdictId: verdict.id,
    compilationError: verdict.compilationError
  });
  systemAccount.free();

  let socketData = {
    contestId: solution.contestId,
    solution: filter(Object.assign(solution.get({ plain: true }), { verdict }), {
      exclude: [ 'sourceCode' ]
    })
  };
  sockets.emitVerdictUpdateEvent(socketData);
  sockets.emitUserSolutionsEvent(solution.userId, 'verdict updated', socketData.solution);
  sockets.emitAdminSolutionsEvent('verdict updated', socketData.solution);
  sockets.emitTableUpdateEvent({
    contestId: solution.contestId
  });
  return solution;
}

export function buildConsoleMessage(message = '') {
  return consoleMessagePattern.replace('{systemType}', SYSTEM_TYPE)
    .replace('{message}', message);
}