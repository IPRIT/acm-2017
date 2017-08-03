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
    this.problemSymbol = problemSymbol;
    this.contestValue = contestValue;
  }

  /**
   * @param {User} viewAs
   * @param {number} timeMs
   * @return {{result: string, problemSymbol: string, cellFrozen?: boolean, acceptedAt?: string, inPractice?: boolean}}
   */
  getDisplayCellValue(viewAs, timeMs = Date.now()) {
    let canViewFully = this.canViewFully( viewAs );
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

  /**
   * @param {Contest|ContestValue|*} contest
   */
  setContest(contest) {
    if (contest instanceof ContestValue) {
      this.contestValue = contest;
    } else {
      this.contestValue = new ContestValue(contest);
    }
  }

  /**
   * @param {Solution[]} solutions
   */
  initializeWithSolutions(solutions) {
    this.clear();
    solutions.forEach(solution => this.addSolution(solution));
  }

  /**
   * @param {Solution} solution
   * @param {boolean} isInitAction
   * @return {Cell}
   */
  addSolution(solution, isInitAction = false) {
    return this._insertSolution(solution, isInitAction);
  }

  /**
   * @param {number} solutionId
   * @return {Cell}
   */
  removeSolution(solutionId) {
    let commit = this._findCommitBySolutionId( solutionId );
    if (commit) {
      if (commit.value.isAccepted) {
        this.repository.ejectCommitByRealTimeMs(commit.realCreatedAtMs);
        this.isForceUpdateNeeded = true;
        this.emit('cell.forceUpdateNeeded', this);
      } else {
        this._decreaseWrongAttemptsNextTo(commit);
        this.repository.ejectCommitByRealTimeMs(commit.realCreatedAtMs);
        this.emit('cell.solutionRemoved', this, commit);
      }
    }
    return this;
  }

  /**
   * @param {number} timeMs
   */
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

  /**
   * @param {User} viewAs
   * @return {boolean}
   */
  canViewFully(viewAs) {
    return viewAs.id === this.userId || viewAs.isAdmin;
  }

  /**
   * @param {Number} timeMs
   * @return {number}
   */
  computePenaltyBeforeTimeMs(timeMs = Date.now()) {
    let commit = this.repository.getFirstCommitBeforeTimeMs( timeMs );
    return commit
      ? this._computePenaltyByCommitValue(commit.value) : 0;
  }

  /**
   * @param {Commit} commit
   * @param {number} by
   * @private
   */
  _decreaseWrongAttemptsNextTo(commit, by = 1) {
    let nextCommit = commit.child;
    while (nextCommit) {
      nextCommit.value.wrongAttempts -= by;
      nextCommit = nextCommit.child;
    }
  }

  /**
   * @param {Solution} solution
   * @param {boolean} isInitAction
   * @return {Cell}
   * @private
   */
  _insertSolution(solution, isInitAction = false) {
    let { isAccepted, sentAtMs } = this.currentValue || {};
    let isCurrentSolutionAccepted = solution.verdictId === 1;
    if (isAccepted) {
      if (isCurrentSolutionAccepted) {
        if (sentAtMs > solution.sentAtMs) {
          this.repository.ejectCommitByRealTimeMs( sentAtMs );
        } else {
          return this;
        }
      }
      if (sentAtMs < solution.sentAtMs) {
        return this;
      }
    }
    let commitValue = new CellCommitValue(solution.id, isCurrentSolutionAccepted, 0, solution.sentAtMs);
    this.repository.commit( commitValue );
    this._normalizeWrongAttempts();
    if (!isInitAction) {
      this.emit('cell.changed', this, commitValue);
    }
    return this;
  }

  /**
   * @private
   */
  _normalizeWrongAttempts() {
    if (!this.repository.getCommits().length) {
      return this;
    }
    let commitRef = this.repository.getCommits()[0];
    let wrongAttempts = 0;
    while (commitRef.child) {
      commitRef.value.wrongAttempts = commitRef.value.isAccepted
        ? wrongAttempts : ++wrongAttempts;
      commitRef = commitRef.child;
    }
  }

  /**
   * @param {number} solutionId
   * @return {Commit}
   * @private
   */
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

  /**
   * @param {number} diffTime Difference between contest's start time and solution's accept time
   * @return {string}
   * @private
   */
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

  /**
   * @private
   */
  _removeAllEventListeners() {
    this.removeAllListeners('cell.accepted');
    this.removeAllListeners('cell.newWrongAttempt');
    this.removeAllListeners('cell.forceUpdateNeeded');
    this.removeAllListeners('cell.solutionRemoved');
  }

  clear() {
    this.repository.reset();
  }

  /**
   * @return {number}
   */
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