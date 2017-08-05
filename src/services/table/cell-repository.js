import { RepositoryBranch } from "./repository";
import * as utils from '../../utils';

export class CellRepositoryBranch extends RepositoryBranch {

  constructor() {
    super();
  }

  /**
   * @param {CellCommitValue} commitValue
   * @return {Commit}
   */
  commit(commitValue) {
    return super.commit(commitValue, commitValue.sentAtMs);
  }

  /**
   * @param {number} timeMs
   * @return {Commit[]}
   */
  getCommitsAfterTimeMs(timeMs) {
    let commits = this.getCommits();
    return commits.slice(
      this._upperBoundByRealTimeMs(commits, timeMs)
    );
  }

  /**
   * @param {number} timeMs
   * @return {Commit}
   */
  getFirstCommitAfterTimeMs(timeMs) {
    let commits = this.getCommits();
    return commits[ this._upperBoundByRealTimeMs(commits, timeMs) ];
  }

  /**
   * @param {number} timeMs
   * @return {Commit[]}
   */
  getCommitsBeforeTimeMs(timeMs) {
    let commits = this.getCommits();
    return commits.slice(
      0, this._lowerBoundByRealTimeMs(commits, timeMs) + 1
    );
  }

  /**
   * @param {number} timeMs
   * @return {Commit}
   */
  getFirstCommitBeforeTimeMs(timeMs) {
    let commits = this.getCommits();
    return commits[ this._lowerBoundByRealTimeMs(commits, timeMs) ];
  }

  /**
   * @param {number} timeMs
   * @return {Commit}
   */
  ejectCommitByRealTimeMs(timeMs) {
    let commitIndex = this._searchIndexByRealTimeMs(timeMs);
    if (commitIndex < 0) {
      return null;
    }
    return this._ejectCommitByIndex( commitIndex );
  }

  /**
   * @param {number} timeMs
   * @return {number}
   * @private
   */
  _searchIndexByRealTimeMs(timeMs) {
    let [ lowerIndex, upperIndex ] = this._binarySearchIndexes(this._commits, timeMs);
    if (lowerIndex !== upperIndex) {
      return -1;
    }
    return lowerIndex;
  }

  /**
   * @param {*[]} array
   * @param {number} timeMs
   * @return {number}
   * @private
   */
  _lowerBoundByRealTimeMs(array, timeMs) {
    let [ lowerIndex ] = this._binarySearchIndexes(array, timeMs);
    return lowerIndex;
  }

  /**
   * @param {*[]} array
   * @param {number} timeMs
   * @return {number}
   * @private
   */
  _upperBoundByRealTimeMs(array, timeMs) {
    let [ , upperIndex ] = this._binarySearchIndexes(array, timeMs);
    return upperIndex;
  }

  /**
   * @param {*[]} array
   * @param {number} value
   * @return {[number, number]}
   * @private
   */
  _binarySearchIndexes(array, value) {
    return utils.binarySearchIndexes(array, value, 'realCreatedAtMs', 1);
  }
}