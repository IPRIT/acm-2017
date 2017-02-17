import * as accountsPool from './accountsPool';
import { sendSolution, getVerdict, getCompilationError  } from './index';
import Promise from 'bluebird';
import * as sockets from '../../socket';

const maxAttemptsNumber = 3;
const nextAttemptAfterMs = 5 * 1000;
const serviceUnavailableVerdictId = 13;
const verdictCheckTimeoutMs = 300;
const maxAccountWaitingMs = 60 * 1000;

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
        solution: Object.assign(solution.get({ plain: true }), { verdict })
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
  systemAccount.free();
  solution.retriesNumber++;
  if (solution.retriesNumber >= maxAttemptsNumber) {
    await solution.update({
      retriesNumber: solution.retriesNumber,
      verdictId: serviceUnavailableVerdictId,
      verdictGotAtMs: Date.now(),
      errorTrace: (error || '').toString()
    });
  } else {
    await solution.update({
      retriesNumber: solution.retriesNumber,
      nextAttemptWillBeAtMs: Date.now() + nextAttemptAfterMs * solution.retriesNumber
    });
  }
}

async function saveVerdict(solution, systemAccount, verdict) {
  systemAccount.free();
  await solution.update({
    verdictGotAtMs: Date.now(),
    testNumber: verdict.testNumber,
    executionTime: verdict.executionTime,
    memory: verdict.memory,
    verdictId: verdict.id,
    compilationError: verdict.compilationError
  });
  
  let contest = await solution.getContest();
  let isContestFrozen = contest.isFrozen;
  if (!isContestFrozen) {
    sockets.emitTableUpdateEvent({
      contestId: contest.id
    });
  }
  sockets.emitVerdictUpdateEvent({
    contestId: solution.contestId,
    solution: Object.assign(solution.get({ plain: true }), { verdict })
  });
  return solution;
}