import Disposable from "./disposable";
import { CellRepositoryBranch } from "./cell-repository";
import { ContestValue } from "./contest-value";
import { CellCommitValue } from "./cell-commit-value";

export class Cell extends Disposable {

  repository = new CellRepositoryBranch();
  contestValue;

  isForceUpdateNeeded = false;

  userId;
  problemId;
  problemSymbol;

  /**
   * @param {number} userId
   * @param {number} problemId
   * @param {string} problemSymbol
   * @param {ContestValue} contestValue
   */
  constructor(userId, problemId, problemSymbol, contestValue = null) {
    super();
    this.userId = userId;
    this.problemId = problemId;
    this.contestValue = contestValue;
    this.problemSymbol = problemSymbol;
  }

  setContest(contest) {
    this.contestValue = new ContestValue(contest);
  }

  addSolution(solution) {
    if (!this.isCellAccepted) {
      if (solution.verdictId === 1) {
        this._accept(solution);
      } else {
        this._addWrongAttempt(solution);
      }
    }
    return this;
  }

  removeAttempt(solutionId) {
    let commit = this._findCommitBySolutionId( solutionId );
    if (commit) {
      if (commit.value.isAccepted) {
        this.repository.ejectCommitByRealTimeMs(commit.realCreatedAtMs);
        this.isForceUpdateNeeded = true;
      } else {
        this._decreaseWrongAttemptsNextTo(commit);
        this.repository.ejectCommitByRealTimeMs(commit.realCreatedAtMs);
      }
    }
    return this;
  }

  getDisplayCellValue(timeMs = Infinity) {
    let commitValue = this.getCellValue( timeMs );
    if (!commitValue) {
      return {
        result: '—',
        problemSymbol: this.problemSymbol,
        cellFrozen: this.repository.getCommits().length > 0
      }
    }
    let inPractice = commitValue.sentAtMs > this.contestValue.absoluteDurationTimeMs;
    if (commitValue.isAccepted) {
      return {
        result: commitValue.wrongAttempts > 0
          ? '+' + commitValue.wrongAttempts : '+',
        problemSymbol: this.problemSymbol,
        acceptedAt: this._getAcceptTime(commitValue),
        inPractice
      }
    } else {
      return {
        result: commitValue.wrongAttempts > 0
          ? '—' + commitValue.wrongAttempts : '—',
        problemSymbol: this.problemSymbol,
        cellFrozen: !this.isHeadValue( commitValue )
      }
    }
  }

  getCellValue(timeMs = Infinity) {
    let { value } = this.repository.getFirstCommitBeforeTimeMs( timeMs ) || { };
    return value;
  }

  /**
   * @param {CellCommitValue} commitValue
   */
  isHeadValue(commitValue) {
    if (!this.currentValue || !commitValue) {
      return false;
    }
    return commitValue.sentAtMs === this.currentValue.sentAtMs;
  }

  computePenaltyBeforeTimeMs(timeMs = Infinity) {
    let commit = this.repository.getFirstCommitBeforeTimeMs( timeMs );
    return commit
      ? this._computePenaltyByCommitValue(commit.value) : 0;
  }

  _decreaseWrongAttemptsNextTo(commit, by = 1) {
    let nextCommit = commit.child;
    while (nextCommit) {
      nextCommit.value.wrongAttempts -= by;
      nextCommit = nextCommit.child;
    }
  }

  _addWrongAttempt(solution) {
    let { wrongAttempts = 0 } = this.currentValue || {};
    let commitValue = new CellCommitValue(solution.id, false, wrongAttempts + 1, solution.sentAtMs);
    this.repository.commit( commitValue );
    return this;
  }

  _accept(solution) {
    let { wrongAttempts = 0 } = this.currentValue || {};
    let commitValue = new CellCommitValue(solution.id, true, wrongAttempts, solution.sentAtMs);
    this.repository.commit( commitValue );
    return this;
  }

  _findCommitBySolutionId(solutionId) {
    return this.repository.getCommits().find(commit => {
      return commit.value.solutionId === solutionId;
    });
  }

  /**
   * @param {CellCommitValue} commitValue
   * @return {number}
   * @private
   */
  _computePenaltyByCommitValue(commitValue) {
    if (!commitValue || !commitValue.isAccepted) {
      return 0;
    }
    const PENALTY_MINUTES_NUMBER = 20;
    return Math.floor((commitValue.sentAtMs - this.contestValue.startTimeMs) / (60 * 1000))
      + PENALTY_MINUTES_NUMBER * commitValue.wrongAttempts;
  }

  /**
   * @param {CellCommitValue} commitValue
   * @return {string}
   * @private
   */
  _getAcceptTime(commitValue) {
    return this._formatAcceptTime(commitValue.sentAtMs - this.contestValue.startTimeMs);
  }

  _formatAcceptTime(diffTime) {
    let allSeconds = Math.floor(diffTime / 1000),
      minutes = Math.floor(allSeconds / 60),
      hours = Math.floor(minutes / 60);
    minutes %= 60;
    let leftPad = (number, zeros) => '0'.repeat(zeros) + number;
    let zeroFill = number => leftPad(number, 2 - Math.min(2, number.toString().length)),
      timeFormat = 'hh:mm';
    return timeFormat
      .replace(/(hh)/gi, zeroFill(hours))
      .replace(/(mm)/gi, zeroFill(minutes));
  }

  get penalty() {
    return this._computePenaltyByCommitValue( this.currentValue );
  }

  /**
   * @return {CellCommitValue|null}
   */
  get currentValue() {
    return this.repository.head
      ? this.repository.head.value : null;
  }

  /**
   * @return {boolean}
   */
  get isCellAccepted() {
    return this.currentValue
      ? this.currentValue.isAccepted : false;
  }
}