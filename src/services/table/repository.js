import { Commit } from "./commit";

export class RepositoryBranch {

  /**
   * @type {Commit[]}
   * @private
   */
  _commits = [];

  constructor() {
  }

  /**
   * @param {*} params
   */
  getCommits(params = {}) {
    return this._commits.map(commit => {
      return commit.get( params );
    });
  }

  /**
   * @param {Commit[]|null} commits
   */
  getPlainCommits(commits) {
    return (commits || this._commits).map(commit => {
      return commit.get({ plain: true });
    });
  }

  /**
   * @param {*} object
   * @param {number} realCommitTimeMs
   * @return {Commit}
   */
  commit(object, realCommitTimeMs) {
    let commit = new Commit(object, realCommitTimeMs);
    // todo: insert commit in appropriate place (binary search by real commit time)
    commit.parent = this.head;
    if (this.headIndex >= 0) {
      this.head.child = commit;
    }
    this._commits.push( commit );
    return commit;
  }

  /**
   * @return {RepositoryBranch}
   */
  rollback() {
    if (this.headIndex >= 0) {
      let deletingCommit = this._commits.pop();
      this.head.child = null;
      deletingCommit.parent = null;
    }
    return this;
  }

  /**
   * @param {Commit|string} commitOrHash
   * @return {RepositoryBranch}
   */
  revertTo(commitOrHash) {
    let futureHeadIndex = this._searchIndexByCommit(commitOrHash);
    if (futureHeadIndex >= 0
      && futureHeadIndex < this.headIndex) {
      this._commits.splice(futureHeadIndex + 1);
      this.head.child = null;
    }
    return this;
  }

  /**
   * @param {Commit|string} commitOrHash
   * @return {Commit}
   */
  ejectCommit(commitOrHash) {
    let commitIndex = this._searchIndexByCommit(commitOrHash);
    if (commitIndex < 0) {
      return null;
    }
    return this.ejectCommitByIndex( commitIndex );
  }

  /**
   * @param {Commit|string} commitOrHash
   * @return {Commit[]}
   */
  getCommitsAfterCommit(commitOrHash) {
    let searchIndex = this._searchIndexByCommit(commitOrHash);
    if (searchIndex < 0) {
      return [];
    }
    return this._commits.slice( searchIndex );
  }

  /**
   * @param {Commit|string} commitOrHash
   * @return {Commit[]}
   */
  getCommitsBeforeCommit(commitOrHash) {
    let searchIndex = this._searchIndexByCommit(commitOrHash);
    if (searchIndex < 0) {
      return [];
    }
    return this._commits.slice( 0, searchIndex + 1 );
  }

  /**
   * @param {Commit} commit
   * @return {boolean}
   */
  isHeadCommit(commit) {
    return commit && this._commits.length > 0
      && commit.hash === this.head.hash;
  }

  /**
   * @param {number} commitIndex
   * @return {Commit|null}
   */
  _ejectCommitByIndex(commitIndex) {
    if (commitIndex < 0) {
      return null;
    }
    let ejectingCommit = this._commits[ commitIndex ];
    this._disconnectCommit(ejectingCommit);
    this._commits.splice( commitIndex, 1 );
    return ejectingCommit;
  }

  /**
   * @param {Commit} commit
   * @private
   */
  _disconnectCommit(commit) {
    if (commit.parent) {
      if (commit.child) {
        commit.parent.child = commit.child;
        commit.child.parent = commit.parent;
      } else {
        commit.parent.child = null;
      }
    } else if (commit.child) {
      commit.child.parent = null;
    }
    commit.child = null;
    commit.parent = null;
  }

  /**
   * @param {Commit|string} commitOrHash
   * @return {number}
   * @private
   */
  _searchIndexByCommit(commitOrHash) {
    let hash = this._resolveCommitHash(commitOrHash);
    return this._commits.findIndex(commit => {
      return commit.hash === hash;
    });
  }

  /**
   * @param {Commit|string} commitOrHash
   * @return {string}
   * @private
   */
  _resolveCommitHash(commitOrHash) {
    let hash = commitOrHash;
    if (typeof commitOrHash === 'object') {
      hash = commitOrHash.hash;
    }
    return hash;
  }

  /**
   * @return {number}
   */
  get headIndex() {
    return this._commits.length - 1;
  }

  /**
   * @return {Commit|null}
   */
  get head() {
    if (!this._commits.length) {
      return null;
    }
    return this._commits[ this.headIndex ];
  }

  /**
   * @return {Commit|null}
   */
  get tail() {
    if (!this._commits.length) {
      return null;
    }
    return this._commits[ 0 ];
  }

  reset() {
    while (this._commits.length) {
      this._ejectCommitByIndex( 0 );
    }
    this._commits = [];
  }
}