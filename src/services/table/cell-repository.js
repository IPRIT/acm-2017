import { Repository } from "./repository";

export class CellRepositoryBranch extends Repository {

  constructor() {
    super();
  }

  getCommitsAfterTimeMs(timeMs) {
    let commits = this.getCommits();
    return commits.slice(
      this._upperBoundByRealTimeMs(commits, timeMs)
    );
  }

  getFirstCommitAfterTimeMs(timeMs) {
    let commits = this.getCommits();
    return commits[ this._upperBoundByRealTimeMs(commits, timeMs) ];
  }

  getCommitsBeforeTimeMs(timeMs) {
    let commits = this.getCommits();
    return commits.slice(
      0, this._lowerBoundByRealTimeMs(commits, timeMs) + 1
    );
  }

  getFirstCommitBeforeTimeMs(timeMs) {
    let commits = this.getCommits();
    return commits[ this._lowerBoundByRealTimeMs(commits, timeMs) ];
  }

  _lowerBoundByRealTimeMs(array, timeMs) {
    let [ lowerIndex ] = this._binarySearchIndexes(array, timeMs);
    return lowerIndex;
  }

  _upperBoundByRealTimeMs(array, timeMs) {
    let [ , upperIndex ] = this._binarySearchIndexes(array, timeMs);
    return upperIndex;
  }

  _binarySearchIndexes(array, value) {
    let [ left, right ] = [ 0, array.length - 1 ];
    if (!array.length || value <= array[ left ].realCreatedAtMs) {
      return [ 0, 0 ];
    } else if (value >= array[ right ].realCreatedAtMs) {
      return [ right, right ];
    }
    while (right - left > 1) {
      let mid = left + Math.floor( ( right - left ) / 2 );
      if (value <= array[ mid ].realCreatedAtMs) {
        right = mid;
      } else {
        left = mid;
      }
    }
    if (array[ right ].realCreatedAtMs === value) {
      left = right;
    } else if (array[ left ].realCreatedAtMs === value) {
      right = left;
    }
    return [ left, right ];
  }
}