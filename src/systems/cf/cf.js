import * as accountsPool from './accountsPool';
import { sendSolution, getVerdict, getCompilationError  } from './index';
import * as models from '../../models';
import Promise from 'bluebird';
import * as sockets from '../../socket';
import filter from "../../utils/filter";
import * as accountMethods from './account';

const maxAttemptsNumber = 3;
const nextAttemptAfterMs = 10 * 1000;
const serviceUnavailableVerdictId = 13;
const sameSolutionVerdictId = 15;
const solutionWithWarningVerdictId = 16;
const tooMuchSolutionsVerdictId = 17;
const verdictCheckTimeoutMs = 100;
const maxAccountWaitingMs = 90 * 1000;

export async function handle(solution) {
  let systemAccount = await accountsPool.getFreeAccount();
  systemAccount.busy();
  
  try {
    let contextRow = await sendSolution(solution, systemAccount);

    let verdict;
    while (!verdict || !verdict.isTerminal) {
      if (systemAccount.lastSentSolutionAtMs + maxAccountWaitingMs < Date.now()) {
        throw new Error('Time limit has exceeded');
      }
      verdict = await getVerdict(solution, systemAccount, contextRow);
      sockets.emitVerdictUpdateEvent({
        contestId: solution.contestId,
        solution: filter(Object.assign(solution.get({ plain: true }), { verdict }), {
          exclude: [ 'sourceCode' ]
        })
      });
      await Promise.delay(verdictCheckTimeoutMs);
    }
    if (verdict.id === 3) {
      let compilationError = await getCompilationError(systemAccount, contextRow);
      Object.assign(verdict, { compilationError });
    }
    return saveVerdict(solution, systemAccount, verdict);
  } catch (error) {
    await handleError(error, solution, systemAccount);
  }
}

async function handleError(error, solution, systemAccount) {
  let isAuth = await accountMethods.isAuth(systemAccount);
  if (!isAuth) {
    console.log(`[System report] Refreshing Codeforces account [${systemAccount.instance.systemLogin}]...`);
    await accountMethods.login(systemAccount);
  }
  
  Promise.delay(10 * 1000).then(_ => systemAccount.free());
  solution.retriesNumber++;
  if (solution.retriesNumber >= maxAttemptsNumber) {
    let verdictId = getVerdictIdByError(error);
    let verdict = await models.Verdict.findByPrimary(verdictId);
    await solution.update({
      retriesNumber: solution.retriesNumber,
      verdictId: verdict.id,
      verdictGotAtMs: Date.now(),
      errorTrace: (error || '').toString()
    });
    sockets.emitVerdictUpdateEvent({
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
    });
  } else {
    await solution.update({
      retriesNumber: solution.retriesNumber,
      nextAttemptWillBeAtMs: Date.now() + nextAttemptAfterMs * solution.retriesNumber
    });
    sockets.emitVerdictUpdateEvent({
      contestId: solution.contestId,
      solution: filter(Object.assign(solution.get({ plain: true }), {
        _currentAttempt: solution.retriesNumber
      }), {
        exclude: [ 'sourceCode' ]
      })
    });
  }
}

function getVerdictIdByError(error) {
  if (!error || !error.message) {
    return serviceUnavailableVerdictId;
  } else if (error.message.includes( 'Same solution' )) {
    return sameSolutionVerdictId;
  } else if (error.message.includes( 'Warning' )) {
    return solutionWithWarningVerdictId;
  } else if (error.message.includes( 'Too much solutions' )) {
    return tooMuchSolutionsVerdictId;
  } else {
    return serviceUnavailableVerdictId;
  }
}

async function saveVerdict(solution, systemAccount, verdict) {
  await solution.update({
    verdictGotAtMs: Date.now(),
    testNumber: verdict.id === 1 ? 0 : verdict.testNumber,
    executionTime: verdict.executionTime,
    memory: verdict.memory,
    verdictId: verdict.id,
    compilationError: verdict.compilationError
  });
  systemAccount.free();
  
  sockets.emitVerdictUpdateEvent({
    contestId: solution.contestId,
    solution: filter(Object.assign(solution.get({ plain: true }), { verdict }), {
      exclude: [ 'sourceCode' ]
    })
  });
  sockets.emitTableUpdateEvent({
    contestId: solution.contestId
  });
  return solution;
}