import Promise from 'bluebird';
import * as models from '../../models';
import * as sockets from '../../socket';
import { getFreeAccount } from "./accountsPool";
import { sendSolution } from "./sendSolution";
import { getVerdict } from "./getVerdict";
import { getCompilationError } from "./getCompilationError";
import { ensureNumber } from "../../utils";
import filter from "../../utils/filter";

const maxAttemptsNumber = 3;
const nextAttemptAfterMs = 10 * 1000;
const serviceUnavailableVerdictId = 13;
const verdictCheckTimeoutMs = 100;
const maxAccountWaitingMs = 5 * 60 * 1000;

export async function handle(solution) {
  let systemAccount = await getFreeAccount();
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
    console.error(error);
    await handleError(error, solution, systemAccount);
  }
}

async function handleError(error, solution, systemAccount) {
  Promise.delay(10 * 1000).then(_ => systemAccount.free());
  solution.retriesNumber++;
  
  if (solution.retriesNumber >= maxAttemptsNumber) {
    let verdictId = serviceUnavailableVerdictId;
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

async function saveVerdict(solution, systemAccount, verdict) {
  await solution.update({
    verdictGotAtMs: Date.now(),
    testNumber: verdict.id === 1 ? 0 : ensureNumber(verdict.testNumber),
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