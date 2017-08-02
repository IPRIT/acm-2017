import { TableManager } from "./table-manager";
import * as utils from '../../utils';

export class GlobalTablesManager {

  /**
   * @type {GlobalTablesManager}
   * @static
   */
  static instance;

  /**
   * @type {Map}
   * @private
   */
  _tableManagersMap = new Map();

  constructor() {
  }

  /**
   * @return {GlobalTablesManager}
   */
  static getInstance() {
    if (!this.instance) {
      this.instance = new GlobalTablesManager();
    }
    return this.instance;
  }

  /**
   * @param {number} contestId Contest ID
   * @return {TableManager}
   */
  getTableManager(contestId) {
    contestId = utils.ensureNumber( contestId );
    if (this._tableManagersMap.has( contestId )) {
      return this._tableManagersMap.get( contestId );
    }
    let tableManager = this._createTableManager( contestId );
    this._tableManagersMap.set( contestId, tableManager );
    return tableManager;
  }

  /**
   * @param {number} contestId
   * @return {TableManager}
   * @private
   */
  _createTableManager(contestId) {
    return new TableManager( contestId );
  }
}