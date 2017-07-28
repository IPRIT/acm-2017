import { Commit } from "./commit";

export class Repository {

  _commits = [];

  constructor() {
  }

  getCommits() {
    return this._commits;
  }

  commit(object, realCommitTimeMs) {
    let commit = new Commit(object, realCommitTimeMs);
    commit.parent = this.master;
    if (this.masterIndex >= 0) {
      this.master.child = commit;
    }
    this._commits.push( commit );
    return commit;
  }

  rollback() {
    let masterIndex = this.masterIndex;
    if (masterIndex >= 0) {
      let deletingCommit = this._commits.pop();
      this.master.child = null;
      deletingCommit.parent = null;
    }
    return this;
  }

  revertTo(commitOrHash) {
    let futureMasterIndex = this._searchIndexByCommit(commitOrHash);
    if (futureMasterIndex >= 0
      && futureMasterIndex < this.masterIndex) {
      this._commits.splice(futureMasterIndex + 1);
      this.master.child = null;
    }
    return this;
  }

  getCommitsAfterCommit(commitOrHash) {
    let searchIndex = this._searchIndexByCommit(commitOrHash);
    if (searchIndex < 0) {
      return [];
    }
    return this._commits.slice( searchIndex );
  }

  getCommitsBeforeCommit(commitOrHash) {
    let searchIndex = this._searchIndexByCommit(commitOrHash);
    if (searchIndex < 0) {
      return [];
    }
    return this._commits.slice( 0, searchIndex + 1 );
  }

  _searchIndexByCommit(commitOrHash) {
    let hash = this._resolveCommitHash(commitOrHash);
    return this._commits.findIndex(commit => {
      return commit.hash === hash;
    });
  }

  _lowerBoundByRealTimeMs(timeMs) {

  }

  _upperBoundByRealTimeMs(timeMs) {

  }

  _resolveCommitHash(commitOrHash) {
    let hash = commitOrHash;
    if (typeof commitOrHash === 'object') {
      hash = commitOrHash.hash;
    }
    return hash;
  }

  get masterIndex() {
    return this._commits.length - 1;
  }

  get master() {
    if (!this._commits.length) {
      return null;
    }
    return this._commits[ this._commits.length - 1 ];
  }

  reset() {
    this._commits = [];
  }
}