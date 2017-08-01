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
  groupNumber;
  globalIndex;

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
      penalty: this.getPenalty( changedTimeMs ),
      acceptedSolutions: this.getAcceptedSolutions( changedTimeMs ),
      acceptedSolutionsInTime: this.getAcceptedSolutionsInTime( changedTimeMs ),
      user: this.user,
      cells: this.getPlainCells( viewAs, changedTimeMs )
    }
  }

  getPlainCells(viewAs, timeMs = Date.now()) {
    return this._cells.map(cell => {
      return cell.getDisplayCellValue( viewAs, timeMs );
    });
  }

  getCellByProblemId(problemId) {
    return this.getCellByIndex(
      this._getCellIndexByProblemId(problemId)
    );
  }

  getCellByProblemSymbol(problemSymbol) {
    let cellIndex = getIntegerIndex( problemSymbol );
    return this.getCellByIndex( cellIndex );
  }

  getCellByIndex(cellIndex) {
    return this._cells[ cellIndex ];
  }

  addCell(problem) {
    let existCell = this.getCellByProblemId(problem.id);
    if (existCell) {
      return existCell;
    }
    let futureIndex = this._cells.length;
    return this._addCell(problem, futureIndex);
  }

  removeCellByProblemId(problemId) {
    let removingCell = this.getCellByProblemId(problemId);
    if (removingCell) {
      let cellIndex = getIntegerIndex( removingCell.problemSymbol );
      this._cells.splice( cellIndex, 1 );
      removingCell.dispose();
    }
  }

  removeCellByProblemSymbol(problemSymbol) {
    let removingCell = this.getCellByProblemSymbol(problemSymbol);
    if (removingCell) {
      let cellIndex = getIntegerIndex( problemSymbol );
      this._cells.splice( cellIndex, 1 );
      removingCell.dispose();
    }
  }

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

  getPenalty(timeMs = Date.now()) {
    return this._cells.reduce((sum, cell) => {
      return sum + cell.computePenaltyBeforeTimeMs( timeMs );
    }, 0);
  }

  getAcceptedSolutions(timeMs = Date.now()) {
    return this._cells.reduce((sum, cell) => {
      let cellValue = cell.getCellValue( timeMs );
      return sum + (cellValue ? Number(cellValue.isAccepted) : 0);
    }, 0);
  }

  getAcceptedSolutionsInTime(timeMs = this.contestValue.absoluteDurationTimeMs) {
    return this._cells.reduce((sum, cell) => {
      let cellValue = cell.getCellValue(
        Math.min(this.contestValue.absoluteDurationTimeMs, timeMs)
      );
      return sum + (cellValue ? Number(cellValue.isAccepted) : 0);
    }, 0);
  }

  addSolution(solution, isInitAction = false) {
    let cell = this.getCellByProblemId(solution.problemId);
    cell.addSolution( solution, isInitAction );
  }

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

  canView(user) {
    return !this.isAdminRow || user.isAdmin;
  }

  canViewFully(user) {
    return this.user.id === user.id || user.isAdmin;
  }

  /**
   * @param {Cell} cell
   */
  onCellAccepted(cell) {
    // todo
  }

  /**
   * @param {Cell} cell
   * @param {CellCommitValue} commitValue
   */
  onCellNewWrongAttempt(cell, commitValue) {
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

  _createCells(problems) {
    for (let problemIndex in problems) {
      let problem = problems[ problemIndex ];
      this._addCell(problem, problemIndex);
    }
    return this;
  }

  _addCell(problem, cellFutureIndex) {
    let symbolIndex = getSymbolIndex( cellFutureIndex );
    let newCell = new Cell(this.user.id, problem.id, symbolIndex, this.contestValue);

    // set event listeners for created cell
    this._addCellListeners(newCell);

    this._cells.push( newCell );
    return newCell;
  }

  _getCellIndexByProblemId(problemId) {
    return this._cells.findIndex(cell => {
      return cell.problemId === problemId;
    });
  }

  _addCellListeners(cell) {
    cell.on('cell.accepted', this.onCellAccepted.bind(this));
    cell.on('cell.newWrongAttempt', this.onCellNewWrongAttempt.bind(this));
    cell.on('cell.forceUpdateNeeded', this.onCellForceUpdateNeeded.bind(this));
    cell.on('cell.solutionRemoved', this.onCellSolutionRemoved.bind(this));
  }

  get penalty() {
    return this.getPenalty();
  }

  get acceptedSolutions() {
    return this.getAcceptedSolutions();
  }

  get acceptedSolutionsInTime() {
    return this.getAcceptedSolutionsInTime();
  }

  get acceptedSolutionsInPracticeTime() {
    return this.acceptedSolutions - this.acceptedSolutionsInTime;
  }

  get isAdminRow() {
    return this.user.isAdmin;
  }

  dispose() {
    this._cells.forEach(cell => cell.dispose());
    super.dispose();
  }
}