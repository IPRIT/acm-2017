import { Commit } from "./commit";

export class Repository {

  _commits = [];

  constructor() {
  }

  getCommits(params = {}) {
    return this._commits.map(commit => {
      return commit.get( params );
    });
  }

  getPlainCommits(commits) {
    return (commits || this._commits).map(commit => {
      return commit.get({ plain: true });
    });
  }

  commit(object, realCommitTimeMs) {
    let commit = new Commit(object, realCommitTimeMs);
    commit.parent = this.head;
    if (this.headIndex >= 0) {
      this.head.child = commit;
    }
    this._commits.push( commit );
    return commit;
  }

  rollback() {
    if (this.headIndex >= 0) {
      let deletingCommit = this._commits.pop();
      this.head.child = null;
      deletingCommit.parent = null;
    }
    return this;
  }

  revertTo(commitOrHash) {
    let futureHeadIndex = this._searchIndexByCommit(commitOrHash);
    if (futureHeadIndex >= 0
      && futureHeadIndex < this.headIndex) {
      this._commits.splice(futureHeadIndex + 1);
      this.head.child = null;
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

  _resolveCommitHash(commitOrHash) {
    let hash = commitOrHash;
    if (typeof commitOrHash === 'object') {
      hash = commitOrHash.hash;
    }
    return hash;
  }

  get headIndex() {
    return this._commits.length - 1;
  }

  get head() {
    if (!this._commits.length) {
      return null;
    }
    return this._commits[ this.headIndex ];
  }

  reset() {
    this._commits = [];
  }
}