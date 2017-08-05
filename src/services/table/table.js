import Disposable from "./disposable";
import { ContestValue } from "./contest-value";
import { Row } from "./row";
import * as utils from "../../utils/utils";
import deap from "deap";
import EventEmitter from 'events';
import { v4 as uuidv4 } from 'uuid';

const TABLE_PAGE_SIZE = 20;

class AbstractTable extends EventEmitter {

  constructor() {
    super();
  }

  dispose() {
    let disposable = new Disposable();
    disposable._deleteObject( this );
  }
}

export class ContestTable extends AbstractTable {

  /**
   * @type {ContestValue}
   */
  contestValue;

  /**
   * @type {Map<string, string>}
   * @private
   */
  _hashMap = new Map();

  /**
   * @type {Problem[]}
   * @private
   */
  _problems = [];

  /**
   * @type {Row[]}
   * @private
   */
  _rows = [];

  /**
   * @param {Contest} contest
   * @param {Problem[]} problems
   * @param {User[]} users
   * @param {Solution[]} solutions
   */
  constructor(contest, problems, users, solutions) {
    super();
    this.contestValue = new ContestValue(contest);
    this.setProblems(problems, true);
    this.initializeRows(users);
    this.initializeWithSolutions(solutions);

    this._updateAllUsersHashes();
  }

  /**
   * @param {User} viewAs
   * @param {*} params
   * @return {{header: *, rows: *, actualTableHash: *, isPastQuery: boolean}}
   */
  render(viewAs, params = {}) {
    this._mergeDefaultParams( params );
    let isPastQuery = this._getTableHash( viewAs ).createdAtMs > params.showInTimeMs;
    return {
      header: this._getTableHeader(),
      rows: this._getOrderedRows(viewAs, params, isPastQuery),
      rowsNumber: this._getRowsNumber( viewAs ),
      actualTableHash: this._getTableHash( viewAs ),
      isPastQuery
    };
  }

  /**
   * @param {User[]} users
   */
  initializeRows(users) {
    users
      .sort((a, b) => a.UserContestEnter.joinTimeMs - b.UserContestEnter.joinTimeMs)
      .forEach(user => this.addRow(user, true));
  }

  /**
   * @param {Solution[]} solutions
   */
  initializeWithSolutions(solutions = []) {
    solutions.forEach(solution => this.addSolution(solution, true));
    this._normalizeWrongAttempts();
    this._initializeTableSort();
  }

  /**
   * @param {User} user
   * @param {boolean} isInitAction
   * @return {Row}
   */
  addRow(user, isInitAction = false) {
    let row = new Row(user, this._problems, this.contestValue);
    this._rows.push( row );
    if (!isInitAction) {
      row.isAdminRow
        ? this._updateHashForAdminUsers() : this._updateHashForRegularUsers();
    }
    return row;
  }

  /**
   * @param {Solution} solution
   * @param {boolean} isInitAction
   */
  addSolution(solution, isInitAction = false) {
    let { userId } = solution;
    let row = this._getRowByUserId(userId);
    row.addSolution( solution, isInitAction );
    if (!isInitAction) {
      row.isAdminRow
        ? this._updateHashForAdminUsers() : this._updateHashForRegularUsers();
      this.rearrangeRow(row);
    }
  }

  /**
   * @param {Solution} solution
   * @return {{cell: Cell, row: Row}}
   */
  removeSolution(solution) {
    let { userId } = solution;
    let row = this._getRowByUserId( userId );
    let cell = row.removeSolution( solution );
    row.isAdminRow
      ? this._updateHashForAdminUsers() : this._updateHashForRegularUsers();
    return { cell, row };
  }

  /**
   * @param {number} userId
   */
  removeRow(userId) {
    let rowIndex = this._getRowIndexByUserId( userId );
    let row = this._rows[ rowIndex ];
    if (row) {
      row.isAdminRow
        ? this._updateHashForAdminUsers() : this._updateHashForRegularUsers();
      row.dispose();
      this._rows.splice(rowIndex, 1);
    }
  }

  /**
   * @param {Problem[]} problems
   * @param {boolean} isInitAction
   */
  setProblems(problems, isInitAction = false) {
    this._problems = problems;
    for (let row of this._rows) {
      row.resetProblems(problems);
    }
    if (!isInitAction) {
      this._updateAllUsersHashes();
    }
  }

  /**
   * @param {Row} row
   */
  rearrangeRow(row) {
    let oldIndex = this._rows.findIndex(_row => _row.user.id === row.user.id);
    let futureIndex = this._findFutureIndex(row);
    if (oldIndex !== futureIndex) {
      let deletedRows = this._rows.splice(oldIndex, 1);
      let shiftValue = Number(oldIndex < futureIndex);
      this._rows.splice(futureIndex - shiftValue, 0, ...deletedRows);
      if (row.isAdminRow) {
        this._updateHashForAdminUsers();
      } else {
        this._updateHashForRegularUsers();
      }
    }
  }

  _normalizeWrongAttempts() {
    this._rows.forEach(row => row.normalizeWrongAttempts());
  }

  /**
   * @private
   */
  _initializeTableSort() {
    this._orderEntireTable(this._rows, this._mockAdminUser);
    this._assembleRanksAndGroups(this._rows);
  }

  /**
   * @param {*} params
   * @private
   */
  _mergeDefaultParams(params) {
    let defaultParams = {
      count: TABLE_PAGE_SIZE,
      offset: 0,
      showInTimeMs: Date.now()
    };
    deap.merge(params, defaultParams);
    params.count = Math.max(0, Math.min(200, utils.ensureNumber(params.count)));
    params.offset = Math.max(0, utils.ensureNumber(params.offset));
    params.showInTimeMs = Math.max(0, utils.ensureNumber(params.showInTimeMs));
    return params;
  }

  /**
   * @param {number} userId
   * @return {Row}
   * @private
   */
  _getRowByUserId(userId) {
    return this._rows[ this._getRowIndexByUserId(userId) ];
  }

  /**
   * @param {number} userId
   * @return {number}
   * @private
   */
  _getRowIndexByUserId(userId) {
    return this._rows.findIndex(row => {
      return row.user.id === userId;
    });
  }

  /**
   * @return {*[]}
   * @private
   */
  _getTableHeader() {
    return this._problems.map((problem, index) => {
      return {
        problemIndex: utils.getSymbolIndex( index ).toUpperCase(),
        name: problem.title
      }
    });
  }

  /**
   * @param {User} viewAs
   * @param {number} count
   * @param {number} offset
   * @param {number} showInTimeMs
   * @param {boolean} isPastQuery
   * @return {Row[]}
   * @private
   */
  _getOrderedRows(viewAs, { count, offset, showInTimeMs }, isPastQuery = false) {
    let sourceRows = [];
    if (isPastQuery || this.contestValue.isContestFrozen) {
      sourceRows = this._orderEntireTable(this._rows.slice(0), viewAs, showInTimeMs);
    } else {
      sourceRows = this._rows;
    }
    return this._assembleRanksAndGroups(
      sourceRows.filter(row => row.canView(viewAs)).map(row => {
        return row.getDisplayRowValue(viewAs, showInTimeMs);
      })
    ).slice(offset, offset + count);
  }

  /**
   * @param {User} viewAs
   * @return {number}
   * @private
   */
  _getRowsNumber(viewAs) {
    return this._rows.filter(row => row.canView(viewAs)).length;
  }

  /**
   * @param {Row[]} rows
   * @param {User} viewAs
   * @param {number} timeMs
   * @return {Row[]}
   * @private
   */
  _orderEntireTable(rows, viewAs, timeMs = Date.now()) {
    let rowsMap = new Map();
    for (let row of rows) {
      let changedTimeMs = this.contestValue.isFrozenIn( timeMs ) && !row.canViewFully( viewAs )
        ? this.contestValue.absoluteFreezeTimeMs : timeMs;
      rowsMap.set(row.user.id, {
        acceptedSolutions: row.getAcceptedSolutions(changedTimeMs),
        penalty: row.getPenalty(changedTimeMs)
      });
    }
    return rows.sort((y, x) => {
      let [ xAcceptedSolutions, yAcceptedSolutions ] = [
        rowsMap.get( x.user.id ).acceptedSolutions,
        rowsMap.get( y.user.id ).acceptedSolutions
      ];
      let [ xPenalty, yPenalty ] = [
        rowsMap.get( x.user.id ).penalty,
        rowsMap.get( y.user.id ).penalty
      ];
      if (xAcceptedSolutions === yAcceptedSolutions) {
        let [ xJoinedTime, yJoinedTime ] = [
          x.user.UserContestEnter.joinTimeMs,
          y.user.UserContestEnter.joinTimeMs
        ];
        return xPenalty === yPenalty ? (
          xJoinedTime === yJoinedTime ? 0 : (
            (xJoinedTime > yJoinedTime) ? -1 : 1
          )
        ) : (
          (xPenalty > yPenalty) ? -1 : 1
        );
      }
      return xAcceptedSolutions < yAcceptedSolutions ? -1 : 1;
    });
  }

  /**
   * @param {Row[]} rows
   * @return {Row[]}
   * @private
   */
  _assembleRanksAndGroups(rows) {
    let currentPlaceCounter = 1, buffer = 0, currentGroupCounter = 1;
    for (let i = 0; i < rows.length; ++i) {
      rows[i].globalIndex = i;
      if (!i) {
        rows[i].rank = currentPlaceCounter;
        rows[i].displayRank = rows[i].rank;
        rows[i].groupNumber = currentGroupCounter;
        continue;
      }
      if (rows[i].penalty === rows[i - 1].penalty
        && rows[i].acceptedSolutions === rows[i - 1].acceptedSolutions) {
        buffer++;
        rows[i].rank = currentPlaceCounter;
        rows[i].displayRank = rows[i].rank;
      } else {
        if (buffer >= 1) {
          for (let index = i - buffer; index < i; ++index) {
            rows[ index ].displayRank = `${currentPlaceCounter}-${currentPlaceCounter + buffer}`;
          }
        }
        currentPlaceCounter += buffer + 1;
        buffer = 0;
        rows[i].rank = currentPlaceCounter;
        rows[i].displayRank = rows[i].rank;
      }
      if (buffer >= 1) {
        for (let index = i - buffer; index <= i; ++index) {
          rows[ index ].displayRank = `${currentPlaceCounter}-${currentPlaceCounter + buffer}`;
        }
      }
      if (rows[i].acceptedSolutions === rows[i - 1].acceptedSolutions) {
        rows[i].groupNumber = currentGroupCounter;
      } else {
        rows[i].groupNumber = ++currentGroupCounter;
      }
    }
    return rows;
  }

  /**
   * @param {Row} row
   * @private
   */
  _findFutureIndex(row) {
    let penalty = row.penalty;
    let acceptedSolutions = row.acceptedSolutions;
    let [ lowerIndex, upperIndex ] = this._binarySearchIndexes(this._rows, acceptedSolutions, 'acceptedSolutions');
    if (lowerIndex !== upperIndex) {
      return upperIndex;
    }
    let [ firstGroupIndex, lastGroupIndex ] = [ lowerIndex, upperIndex ];
    for (let index = firstGroupIndex - 1; index >= 0; index--) {
      if (this._rows[ index ].acceptedSolutions !== acceptedSolutions) {
        break;
      } else {
        firstGroupIndex = index;
      }
    }
    for (let index = lastGroupIndex + 1; index < this._rows.length; index++) {
      if (this._rows[ index ].acceptedSolutions !== acceptedSolutions) {
        break;
      } else {
        lastGroupIndex = index;
      }
    }
    let groupRows = this._rows.slice(firstGroupIndex, lastGroupIndex + 1);
    [ lowerIndex, upperIndex ] = this._binarySearchIndexes(groupRows, penalty, 'penalty', 1);
    if (lowerIndex !== upperIndex) {
      return firstGroupIndex + upperIndex;
    }
    return firstGroupIndex + upperIndex + 1;
  }

  /**
   * @param {Row[]|*[]} array
   * @param {number} value
   * @param {string} key
   * @param {number} order
   * @return {[number, number]}
   * @private
   */
  _binarySearchIndexes(array, value, key, order = -1) {
    return utils.binarySearchIndexes(array, value, key, order);
  }

  /**
   * @return {string}
   * @private
   */
  _computeRandomHash() {
    return utils.passwordHash( uuidv4() );
  }

  /**
   * @private
   */
  _updateHashForRegularUsers() {
    this._hashMap.set('user', {
      hash: this._computeRandomHash(),
      createdAtMs: Date.now()
    });
    this._updateHashForAdminUsers();
  }

  /**
   * @private
   */
  _updateHashForAdminUsers() {
    this._hashMap.set('admin', {
      hash: this._computeRandomHash(),
      createdAtMs: Date.now()
    });
  }

  /**
   * @private
   */
  _updateAllUsersHashes() {
    this._updateHashForRegularUsers();
  }

  /**
   * @param {User} viewAs
   * @return {string}
   * @private
   */
  _getTableHash(viewAs) {
    return viewAs.isAdmin
      ? this.adminUsersHash : this.regularUsersHash;
  }

  /**
   * @return {string}
   */
  get regularUsersHash() {
    return this._hashMap.get( 'user' );
  }

  /**
   * @return {string}
   */
  get adminUsersHash() {
    return this._hashMap.get( 'admin' );
  }

  /**
   * mock admin user just for table rendering when init
   * @return {{id: number, isAdmin: boolean}}
   * @private
   */
  get _mockAdminUser() {
    return {
      id: 1,
      isAdmin: true
    };
  }

  /**
   * mock regular user
   * @return {{id: number, isAdmin: boolean}}
   * @private
   */
  get _mockRegularUser() {
    return {
      id: 1e9,
      isAdmin: false
    };
  }

  dispose() {
    this._rows.forEach(row => row.dispose());
    super.dispose();
  }
}