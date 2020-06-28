import { Cell } from "./cell";
import { getSymbolIndex, getIntegerIndex } from "../../utils/utils";
import Disposable from "./disposable";
import EventEmitter from 'events';

class AbstractRow extends EventEmitter {

  constructor() {
    super();
  }

  dispose() {
    let disposable = new Disposable();
    disposable._deleteObject( this );
  }
}

export class Row extends AbstractRow {

  user;
  contestValue;

  rank;
  displayRank;
  groupNumber;
  globalIndex;

  /**
   * @type {Cell[]}
   * @private
   */
  _cells = [];

  /**
   * @param {object} user
   * @param {Problem[]} problems
   * @param {ContestValue} contestValue
   */
  constructor(user, problems, contestValue) {
    super();
    this.user = user;
    this.contestValue = contestValue;
    this._createCells(problems);
  }

  /**
   * @param {User} viewAs
   * @param {number} timeMs
   * @return {{groupNumber: number, rank: number, penalty: number, acceptedSolutions: number, acceptedSolutionsInTime: number, user: User, cells: Cell[]}}
   */
  getDisplayRowValue(viewAs, timeMs = Date.now()) {
    let changedTimeMs = this.contestValue.isFrozenIn( timeMs ) && !this.canViewFully( viewAs )
      ? this.contestValue.absoluteFreezeTimeMs : timeMs;
    return {
      groupNumber: this.groupNumber,
      globalIndex: this.globalIndex,
      rank: this.rank,
      displayRank: this.displayRank,
      penalty: this.getPenalty( changedTimeMs ),
      acceptedSolutions: this.getAcceptedSolutions( changedTimeMs ),
      acceptedSolutionsInTime: this.getAcceptedSolutionsInTime( changedTimeMs ),
      user: this.user,
      cells: this.getPlainCells( viewAs, changedTimeMs )
    }
  }

  /**
   * @param {User} viewAs
   * @param {number} timeMs
   * @return {Cell[]}
   */
  getPlainCells(viewAs, timeMs = Date.now()) {
    return this._cells.map(cell => {
      return cell.getDisplayCellValue( viewAs, timeMs );
    });
  }

  /**
   * @param {number} problemId
   * @return {Cell}
   */
  getCellByProblemId(problemId) {
    return this.getCellByIndex(
      this._getCellIndexByProblemId(problemId)
    );
  }

  /**
   * @param {string} problemSymbol
   * @return {Cell}
   */
  getCellByProblemSymbol(problemSymbol) {
    let cellIndex = getIntegerIndex( problemSymbol );
    return this.getCellByIndex( cellIndex );
  }

  /**
   * @param {number} cellIndex
   * @return {Cell}
   */
  getCellByIndex(cellIndex) {
    return this._cells[ cellIndex ];
  }

  /**
   * @param {Problem} problem
   * @return {Cell}
   */
  addCell(problem) {
    let existCell = this.getCellByProblemId(problem.id);
    if (existCell) {
      return existCell;
    }
    let futureIndex = this._cells.length;
    return this._addCell(problem, futureIndex);
  }

  /**
   * @param {number} problemId
   */
  removeCellByProblemId(problemId) {
    let removingCell = this.getCellByProblemId(problemId);
    if (removingCell) {
      let cellIndex = getIntegerIndex( removingCell.problemSymbol );
      this._cells.splice( cellIndex, 1 );
      removingCell.dispose();
    }
  }

  /**
   * @param {string} problemSymbol
   */
  removeCellByProblemSymbol(problemSymbol) {
    let removingCell = this.getCellByProblemSymbol(problemSymbol);
    if (removingCell) {
      let cellIndex = getIntegerIndex( problemSymbol );
      this._cells.splice( cellIndex, 1 );
      removingCell.dispose();
    }
  }

  /**
   * @param {Problem[]} newProblems
   */
  resetProblems(newProblems) {
    let oldCellsMap = new Map();
    for (let cell of this._cells) {
      oldCellsMap.set( cell.problemId, cell );
    }
    let newCellsArray = [];
    let cellIndex = 0;
    for (let newProblem of newProblems) {
      if (oldCellsMap.has( newProblem.id )) {
        let cell = oldCellsMap.get( newProblem.id );
        cell.problemSymbol = getSymbolIndex( cellIndex );
        newCellsArray.push( cell );
        oldCellsMap.delete( newProblem.id );
      } else {
        let symbolIndex = getSymbolIndex( cellIndex );
        newCellsArray.push(
          new Cell(this.user.id, newProblem.id, symbolIndex, this.contestValue)
        );
      }
      cellIndex++;
    }
    this._cells = newCellsArray;
    // deleting old cells
    oldCellsMap.forEach(oldCell => {
      oldCell.dispose();
    });
  }

  /**
   * @param {number} timeMs
   * @return {number}
   */
  getPenalty(timeMs = Date.now()) {
    return this._cells.reduce((sum, cell) => {
      return sum + cell.computePenaltyBeforeTimeMs( timeMs );
    }, 0);
  }

  /**
   * @param {number} timeMs
   * @return {number}
   */
  getAcceptedSolutions(timeMs = Date.now()) {
    return this._cells.reduce((sum, cell) => {
      let cellValue = cell.getCellValue( timeMs );
      return sum + (cellValue ? Number(cellValue.isAccepted) : 0);
    }, 0);
  }

  /**
   * @param {number} timeMs
   * @return {number}
   */
  getAcceptedSolutionsInTime(timeMs = this.contestValue.absoluteDurationTimeMs) {
    return this._cells.reduce((sum, cell) => {
      let cellValue = cell.getCellValue(
        Math.min(this.contestValue.absoluteDurationTimeMs, timeMs)
      );
      return sum + (cellValue ? Number(cellValue.isAccepted) : 0);
    }, 0);
  }

  /**
   * @param {Solution} solution
   * @param {boolean} isInitAction
   */
  addSolution(solution, isInitAction = false) {
    let cell = this.getCellByProblemId(solution.problemId);
    if (!cell) {
      return;
    }
    cell.addSolution( solution, isInitAction );
  }

  /**
   * @param {Solution} solution
   * @return {Cell}
   */
  removeSolution(solution) {
    let cell = this.getCellByProblemId(solution.problemId);
    cell.removeSolution(solution.id);
    return cell;
  }

  /**
   * @param {Solution[]} solutions
   */
  initializeWithSolutions(solutions = []) {
    let cellsMap = new Map();
    for (let cell of this._cells) {
      cellsMap.set( cell.problemId, cell );
    }
    for (let solution of solutions) {
      let cell = cellsMap.get( solution.problemId );
      cell.addSolution( solution, true );
    }
  }

  normalizeWrongAttempts() {
    this._cells.forEach(cell => cell.normalizeWrongAttempts());
  }

  /**
   * @param {User} user
   * @return {boolean}
   */
  canView(user) {
    return (!this.isAdminRow || user.isSupervisor)
      && (this.user.id !== 1 || user.id === 1);
  }

  /**
   * @param {User} user
   * @return {boolean}
   */
  canViewFully(user) {
    return this.user.id === user.id || user.isSupervisor;
  }

  /**
   * @param {Cell} cell
   * @param {CellCommitValue} commitValue
   */
  onCellChanged(cell, commitValue) {
    // todo
  }

  /**
   * @param {Cell} cell
   */
  onCellForceUpdateNeeded(cell) {
    // todo
  }

  /**
   * @param {Cell} cell
   * @param {Commit} removedCommit
   */
  onCellSolutionRemoved(cell, removedCommit) {
    // todo
  }

  /**
   * @param {Problem[]} problems
   * @return {Row}
   * @private
   */
  _createCells(problems) {
    for (let problemIndex in problems) {
      let problem = problems[ problemIndex ];
      this._addCell(problem, problemIndex);
    }
    return this;
  }

  /**
   * @param {Problem} problem
   * @param {number} cellFutureIndex
   * @return {Cell}
   * @private
   */
  _addCell(problem, cellFutureIndex) {
    let symbolIndex = getSymbolIndex( cellFutureIndex );
    let newCell = new Cell(this.user.id, problem.id, symbolIndex, this.contestValue);

    // set event listeners for created cell
    this._addCellListeners(newCell);

    this._cells.push( newCell );
    return newCell;
  }

  /**
   * @param {number} problemId
   * @return {number}
   * @private
   */
  _getCellIndexByProblemId(problemId) {
    return this._cells.findIndex(cell => {
      return cell.problemId === problemId;
    });
  }

  /**
   * @param {Cell} cell
   * @private
   */
  _addCellListeners(cell) {
    cell.on('cell.changed', this.onCellChanged.bind(this));
    cell.on('cell.forceUpdateNeeded', this.onCellForceUpdateNeeded.bind(this));
    cell.on('cell.solutionRemoved', this.onCellSolutionRemoved.bind(this));
  }

  /**
   * @return {number}
   */
  get penalty() {
    return this.getPenalty();
  }

  /**
   * @return {number}
   */
  get acceptedSolutions() {
    return this.getAcceptedSolutions();
  }

  /**
   * @return {number}
   */
  get acceptedSolutionsInTime() {
    return this.getAcceptedSolutionsInTime();
  }

  /**
   * @return {number}
   */
  get acceptedSolutionsInPracticeTime() {
    return this.acceptedSolutions - this.acceptedSolutionsInTime;
  }

  /**
   * @return {boolean}
   */
  get isAdminRow() {
    return this.user.isSupervisor;
  }

  dispose() {
    this._cells.forEach(cell => cell.dispose());
    super.dispose();
  }
}