import { Observable } from 'rxjs/Observable';
import { BehaviorSubject } from 'rxjs/BehaviorSubject';
import 'rxjs/add/operator/delay';
import 'rxjs/add/operator/filter';
import 'rxjs/add/operator/take';
import 'rxjs/add/operator/toPromise';
import 'rxjs/add/observable/of';
import { ContestTable } from "./table";
import * as models from '../../models';
import Promise from 'bluebird';
import deap from 'deap';

export class TableManager {

  /**
   * @type {boolean}
   * @private
   */
  _tableInitializing = false;

  /**
   * @type {number}
   * @private
   */
  _contestId;

  /**
   * @type {ContestTable}
   * @private
   */
  _tableInstance;

  /**
   * @type {BehaviorSubject}
   * @private
   */
  _tableSelfDestruct$ = new BehaviorSubject(false);

  /**
   * @type {Subscription}
   * @private
   */
  _tableSelfDestructTimerSubscription;

  /**
   * @type {number}
   * @private
   */
  _tableSelfDestructTimeoutMs = 150000; // 60 * 60 * 1000; // 60 minutes

  /**
   * @type {BehaviorSubject}
   * @private
   */
  _tableInitialized$ = new BehaviorSubject(false);

  /**
   * @param {number} contestId
   */
  constructor(contestId) {
    this._contestId = contestId;
  }

  /**
   * @param {User} as
   * @param {*} params
   * @return {Promise<*>}
   */
  renderAs(as, params = {}) {
    return this._wrapActionOnInit(async () => {
      this._updateSelfDestructTimer();
      return this._tableInstance.render(as, params);
    }, async () => {
      await this._createTableInstance();
      this.selfDestruct$.next(false);
    });
  }

  /**
   * @param {Solution} solution
   */
  addSolution(solution) {
    return this._wrapActionOnInit(async () => {
      this._tableInstance.addSolution( solution );
    });
  }

  /**
   * @param {Solution} solution
   * @param {boolean} followForceUpdate
   * @return {Promise<*>}
   */
  removeSolution(solution, followForceUpdate = true) {
    return this._wrapActionOnInit(async () => {
      let { cell, row } = this._tableInstance.removeSolution( solution );
      if (cell.isForceUpdateNeeded && followForceUpdate) {
        let solutions = await this._getSolutions({
          contestId: this._contestId,
          userId: cell.userId,
          problemId: cell.problemId
        });
        cell.initializeWithSolutions( solutions );
        cell.isForceUpdateNeeded = false;
      }
      this._tableInstance.rearrangeRow( row );
    });
  }

  removeRow(userId) {
    return this._wrapActionOnInit(async () => {
      this._tableInstance.removeRow( userId );
    });
  }

  /**
   * @description Disposing entire table from the memory
   */
  selfDestruct() {
    console.log(`[Table Manager][ContestId = ${this._contestId}] Running self destruct sequence...`);

    this._tableSelfDestruct$.next(true);
    this._tableInitialized$.next(false);

    this._tableInstance.dispose();
    this._tableInstance = null;
    console.log(this._tableInstance);
  }

  /**
   * @description Resets table instance and clears self-destruct timer
   */
  reset() {
    this._clearSelfDestructTimer();
    this.selfDestruct();
  }

  /**
   * @return {ContestTable}
   * @private
   */
  async _createTableInstance() {
    this._tableInitializing = true;

    let contest = await this._getContest( this._contestId );
    if (!contest) {
      this._tableInitializing = false;
      throw new HttpError('Contest not found', 404);
    }
    let contestSolutions = await this._getAllSolutionsForContest( contest );
    let contestProblems = await this._getContestProblems( contest );
    let contestParticipants = await this._getContestants( contest );
    this._tableInstance = new ContestTable(contest, contestProblems, contestParticipants, contestSolutions);

    this._tableInitialized$.next(true);
    this._tableInitializing = false;

    return this._tableInstance;
  }

  /**
   * @description Resets previous self-destruct timer and sets new
   * @private
   */
  _updateSelfDestructTimer() {
    this._clearSelfDestructTimer();
    this._tableSelfDestructTimerSubscription = Observable.of(1)
      .delay( this._tableSelfDestructTimeoutMs )
      .subscribe(observer => this.selfDestruct());
  }

  /**
   * @private
   */
  _clearSelfDestructTimer() {
    if (this._tableSelfDestructTimerSubscription) {
      this._tableSelfDestructTimerSubscription.unsubscribe();
      this._tableSelfDestructTimerSubscription = null;
    }
  }

  /**
   * @param {function} afterInitAction
   * @param {function} initAction
   * @private
   */
  async _wrapActionOnInit(afterInitAction, initAction = async () => true) {
    if (!this._tableInitializing && !this._tableInitialized$.value) {
      let cancellationToken = await initAction();
      if (cancellationToken) {
        return;
      }
    }
    return this._tableInitialized$
      .asObservable()
      .filter(value => value)
      .take(1)
      .toPromise()
      .then(() => afterInitAction());
  }

  /**
   * @param {Contest} contest
   * @return {Promise<Solution[]>}
   * @private
   */
  _getAllSolutionsForContest(contest) {
    return models.Solution.findAll({
      where: {
        contestId: contest.id,
        verdictId: {
          $ne: null
        }
      },
      include: [ models.Verdict ],
      order: [
        [ 'id', 'ASC']
      ]
    }).map(solution => {
      return solution.get({ plain: true })
    }).filter(solution => {
      return solution.Verdict.scored || solution.Verdict.id === 1;
    });
  }

  /**
   * @param {*} whereParams
   * @return {Solution[]}
   * @private
   */
  _getSolutions(whereParams) {
    let defaultParams = {
      verdictId: {
        $ne: null
      }
    };
    deap.merge(whereParams, defaultParams);
    return models.Solution.findAll({
      where: whereParams,
      include: [ models.Verdict ],
      order: [
        [ 'id', 'ASC']
      ]
    }).map(solution => {
      return solution.get({ plain: true })
    }).filter(solution => {
      return solution.Verdict.scored || solution.Verdict.id === 1;
    });
  }

  /**
   * @param {number} contestId
   * @return {Promise<Contest>}
   * @private
   */
  _getContest(contestId) {
    return models.Contest.findByPrimary(contestId);
  }

  /**
   * @param {Contest} contest
   * @return {Promise<User[]>}
   * @private
   */
  _getContestants(contest) {
    return contest.getContestants().map(user => user.get({ plain: true }));
  }

  /**
   * @param {Contest} contest
   * @return {Promise<Problem[]>}
   * @private
   */
  _getContestProblems(contest) {
    return contest.getProblems({
      include: [{
        model: models.ProblemToContest,
        where: {
          contestId: contest.id
        }
      }],
      order: [
        [ models.ProblemToContest, 'id', 'ASC']
      ]
    });
  }

  /**
   * @return {BehaviorSubject}
   */
  get selfDestruct$() {
    return this._tableSelfDestruct$;
  }

  /**
   * @return {ContestTable}
   */
  get tableInstance() {
    return this._tableInstance;
  }
}