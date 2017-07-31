import Disposable from "./disposable";
import { ContestValue } from "./contest-value";
import { Row } from "./row";
import { getSymbolIndex } from "../../utils/utils";
import deap from "deap";
import EventEmitter from 'events';

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

  contestValue;
  hash;

  _problems = [];
  _rows = [];

  constructor(contest, problems, users, solutions) {
    super();
    this.contestValue = new ContestValue(contest);
    this.setProblems(problems);
    this.initializeRows(users);
    this.initializeWithSolutions(solutions);
  }

  render(viewAs, params = {}) {
    let defaultParams = {
      count: TABLE_PAGE_SIZE,
      offset: 0
    };
    deap.merge(params, defaultParams);
    return {
      /*header: this._problems.map((problem, index) => {
        return {
          problemIndex: getSymbolIndex( index ).toUpperCase(),
          name: problem.title
        }
      }),*/
      rows: this._getOrderedRows(viewAs, params)
    }
  }

  setProblems(problems) {
    this._problems = problems;
    for (let row of this._rows) {
      row.resetProblems(problems);
    }
  }

  initializeRows(users) {
    users
      .sort((a, b) => b.UserContestEnter.joinTimeMs - a.UserContestEnter.joinTimeMs)
      .forEach(user => this.addRow(user));
  }

  initializeWithSolutions(solutions = []) {
    solutions.forEach(solution => this.addSolution(solution, true));
    this._initializeTableSort();
  }

  addRow(user) {
    let row = new Row(user, this._problems, this.contestValue);
    this._rows.push( row );
  }

  addSolution(solution, isInitAction = false) {
    let { userId } = solution;
    let row = this._getRowByUserId(userId);
    row.addSolution( solution, isInitAction );
    if (!isInitAction) {
      this._rearrangeRow(row);
    }
  }

  _getRowByUserId(userId) {
    return this._rows[ this._getRowIndexByUserId(userId) ];
  }

  _getRowIndexByUserId(userId) {
    return this._rows.findIndex(row => {
      return row.user.id === userId;
    });
  }

  _getOrderedRows(viewAs, { count, offset }) {
    if (this.contestValue.isContestFrozen) {
      let rows = this._orderEntireTable(this._rows.slice(0), viewAs).filter(row => {
        return row.canView(viewAs);
      }).map(row => {
        return row.getDisplayRowValue(viewAs, this.currentContestTimeForUsersMs);
      });
      return this._assembleRanksAndGroups(rows).slice(offset, offset + count);
    }
    return this._assembleRanksAndGroups(
      this._rows.filter(row => row.canView(viewAs)).map(row => {
        return row.getDisplayRowValue(viewAs, this.currentContestTimeForUsersMs);
      })
    ).slice(offset, offset + count);
  }

  _orderEntireTable(rows, viewAs, timeMs = this.currentContestTimeForUsersMs) {
    let rowsMap = new Map();
    for (let row of rows) {
      rowsMap.set(row.user.id, {
        acceptedSolutions: row.getAcceptedSolutions(viewAs, timeMs),
        penalty: row.getPenalty(viewAs, timeMs)
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
        return xPenalty === yPenalty ? 0 : (
          (xPenalty > yPenalty) ? -1 : 1
        );
      }
      return xAcceptedSolutions < yAcceptedSolutions ? -1 : 1;
    });
  }

  _initializeTableSort() {
    // mock object just for table rendering when init
    let adminUser = {
      id: 1,
      isAdmin: true
    };
    this._orderEntireTable(this._rows, adminUser, this.currentContestTimeForUsersMs);
    this._assembleRanksAndGroups(this._rows);
  }

  _assembleRanksAndGroups(rows) {
    let currentPlaceCounter = 1, buffer = 0, currentGroupCounter = 1;
    for (let i = 0; i < rows.length; ++i) {
      if (!i) {
        rows[i].rank = currentPlaceCounter;
        rows[i].groupNumber = currentGroupCounter;
        continue;
      }
      if (rows[i].penalty === rows[i - 1].penalty
        && rows[i].acceptedSolutions === rows[i - 1].acceptedSolutions) {
        buffer++;
        rows[i].rank = currentPlaceCounter;
      } else {
        currentPlaceCounter += buffer + 1;
        buffer = 0;
        rows[i].rank = currentPlaceCounter;
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
  _rearrangeRow(row) {
    let oldIndex = this._rows.findIndex(_row => _row.user.id === row.user.id);
    let futureIndex = this._findFutureIndex(row);
    console.log('Ranks:', oldIndex, futureIndex);
    if (oldIndex !== futureIndex) {
      let deletedRows = this._rows.splice(oldIndex, 1);
      let shiftValue = Number(oldIndex < futureIndex);
      this._rows.splice(futureIndex - shiftValue, 0, ...deletedRows);
    }
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
   * @param {Row[]|any[]} array
   * @param {number} value
   * @param {string} key
   * @param {number} order
   * @return {[number, number]}
   * @private
   */
  _binarySearchIndexes(array, value, key, order = -1) {
    let [ left, right ] = [ 0, array.length - 1 ];
    if (!array.length || order * value < order * array[ left ][ key ]) {
      return [ -1, 0 ];
    } else if (order * value > order * array[ right ][ key ]) {
      return [ right, right + 1 ];
    }
    while (right - left > 1) {
      let mid = left + Math.floor( ( right - left ) / 2 );
      if (order * value <= order * array[ mid ][ key ]) {
        right = mid;
      } else {
        left = mid;
      }
    }
    if (array[ right ][ key ] === value) {
      left = right;
    } else if (array[ left ][ key ] === value) {
      right = left;
    }
    return [ left, right ];
  }

  get currentContestTimeForUsersMs() {
    return this.contestValue.isContestFrozen
      ? this.contestValue.absoluteFreezeTimeMs : Date.now();
  }

  dispose() {
    this._rows.forEach(row => row.dispose());
    super.dispose();
  }
}