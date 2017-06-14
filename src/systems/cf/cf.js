import Promise from 'bluebird';
import * as accountsPool from './accountsPool';
import * as models from '../../models';
import * as sockets from '../../socket';
import * as accountMethods from './account';
import { sendSolution, getVerdict, getCompilationError  } from './index';
import { appendWatermark, filterEntity as filter } from "../../utils";

const maxAttemptsNumber = 3;
const nextAttemptAfterMs = 10 * 1000;
const serviceUnavailableVerdictId = 13;
const sameSolutionVerdictId = 15;
const solutionWithWarningVerdictId = 16;
const tooMuchSolutionsVerdictId = 17;
const verdictCheckTimeoutMs = 100;
const maxAccountWaitingMs = 120 * 1000;

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
  
  let verdictId = getVerdictIdByError(error);
  if ([ sameSolutionVerdictId, solutionWithWarningVerdictId, tooMuchSolutionsVerdictId ].includes( verdictId )) {
    solution.retriesNumber = maxAttemptsNumber;
  } else {
    solution.retriesNumber++;
  }
  
  if (solution.retriesNumber >= maxAttemptsNumber) {
    let verdict = await models.Verdict.findByPrimary(verdictId);
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
    await appendWatermark(solution);
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