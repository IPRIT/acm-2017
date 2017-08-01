import Disposable from "./disposable";
import { CellRepositoryBranch } from "./cell-repository";
import { ContestValue } from "./contest-value";
import { CellCommitValue } from "./cell-commit-value";
import EventEmitter from 'events';

class AbstractCell extends EventEmitter {

  constructor() {
    super();
  }

  dispose() {
    let disposable = new Disposable();
    disposable._deleteObject( this );
  }
}

export class Cell extends AbstractCell {

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
    if (contest instanceof ContestValue) {
      this.contestValue = contest;
    } else {
      this.contestValue = new ContestValue(contest);
    }
  }

  addSolution(solution, isInitAction = false) {
    if (!this.isCellAccepted) {
      if (solution.verdictId === 1) {
        this._accept(solution, isInitAction);
      } else {
        this._addWrongAttempt(solution, isInitAction);
      }
    }
    return this;
  }

  removeSolution(solutionId) {
    let commit = this._findCommitBySolutionId( solutionId );
    if (commit) {
      if (commit.value.isAccepted) {
        this.repository.ejectCommitByRealTimeMs(commit.realCreatedAtMs);
        this.isForceUpdateNeeded = true;
        this.emit('cell.forceUpdateNeeded', this);
      } else {
        this._decreaseWrongAttemptsNextTo(commit);
        let commit = this.repository.ejectCommitByRealTimeMs(commit.realCreatedAtMs);
        this.emit('cell.solutionRemoved', this, commit);
      }
    }
    return this;
  }

  getDisplayCellValue(viewAs, timeMs = Date.now()) {
    let canViewFully = viewAs.id === this.userId || viewAs.isAdmin;
    let commitValue = this.getCellValue( timeMs );
    if (!commitValue) {
      return {
        result: '—',
        problemSymbol: this.problemSymbol.toUpperCase(),
        cellFrozen: this.repository.getCommits().length > 0
          && this.contestValue.isFrozenIn( timeMs )
          && !canViewFully
      }
    }
    if (commitValue.isAccepted) {
      return {
        result: commitValue.wrongAttempts > 0
          ? '+' + commitValue.wrongAttempts : '+',
        problemSymbol: this.problemSymbol.toUpperCase(),
        acceptedAt: this._getAcceptTime(commitValue),
        inPractice: this.contestValue.isPracticeIn( commitValue.sentAtMs )
      }
    } else {
      return {
        result: commitValue.wrongAttempts > 0
          ? '-' + commitValue.wrongAttempts : '—',
        problemSymbol: this.problemSymbol.toUpperCase(),
        cellFrozen: !this.isHeadValue( commitValue )
          && this.contestValue.isFrozenIn( timeMs )
          && !canViewFully
      }
    }
  }

  getCellValue(timeMs = Date.now()) {
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

  computePenaltyBeforeTimeMs(timeMs = Date.now()) {
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

  _addWrongAttempt(solution, isInitAction = false) {
    let { wrongAttempts = 0 } = this.currentValue || {};
    let commitValue = new CellCommitValue(solution.id, false, wrongAttempts + 1, solution.sentAtMs);
    this.repository.commit( commitValue );
    if (!isInitAction) {
      this.emit('cell.newWrongAttempt', this, commitValue);
    }
    return this;
  }

  _accept(solution, isInitAction = false) {
    let { wrongAttempts = 0 } = this.currentValue || {};
    let commitValue = new CellCommitValue(solution.id, true, wrongAttempts, solution.sentAtMs);
    this.repository.commit( commitValue );
    if (!isInitAction) {
      this.emit('cell.accepted', this, solution);
    }
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

  _removeAllEventListeners() {
    this.removeAllListeners('cell.accepted');
    this.removeAllListeners('cell.newWrongAttempt');
    this.removeAllListeners('cell.forceUpdateNeeded');
    this.removeAllListeners('cell.solutionRemoved');
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

  dispose() {
    this._removeAllEventListeners();
    super.dispose();
  }
}