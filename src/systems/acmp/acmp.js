import * as accountsPool from './accountsPool';
import { sendSolution, getVerdict, getCompilationError  } from './index';
import * as accountMethods from './account';
import Promise from 'bluebird';
import * as sockets from '../../socket';
import filter from "../../utils/filter";

const maxAttemptsNumber = 3;
const nextAttemptAfterMs = 15 * 1000;
const serviceUnavailableVerdictId = 13;
const acmpRestrictionVerdictId = 14;
const acmpRestrictionVerdictName = 'ACMP Restrictions. Wait for a minute';
const verdictCheckTimeoutMs = 100;
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
  console.log(`[System report] Refreshing ACMP account [${systemAccount.instance.systemLogin}]...`);
  await accountMethods.login(systemAccount);
  await Promise.resolve().delay(30 * 1000);
  
  systemAccount.free();
  solution.retriesNumber++;
  if (solution.retriesNumber >= maxAttemptsNumber) {
    await solution.update({
      retriesNumber: solution.retriesNumber,
      verdictId: acmpRestrictionVerdictId,
      verdictGotAtMs: Date.now(),
      errorTrace: (error || '').toString()
    });
    sockets.emitVerdictUpdateEvent({
      contestId: solution.contestId,
      solution: filter(Object.assign(solution.get({ plain: true }), {
        verdict: {
          id: solution.verdictId,
          isTerminal: true,
          name: acmpRestrictionVerdictName,
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