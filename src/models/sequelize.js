import Sequelize from 'sequelize';
import config from '../utils/config';
import Log from 'log4js';

let log = Log.getLogger('Sequelize');

const sequelize = new Sequelize(
  config.db.database,
  config.db.username,
  config.db.password, {
    host: config.db.host,
    dialect: 'mysql',

    pool: {
      max: config.db.maxPoolAmount || 10,
      min: config.db.minPoolAmount || 0,
      idle: config.db.idleTimeoutMs || 10000
    },

    logging: config.env === 'development' ? false && log.debug.bind(log) : false
  }
);

export default sequelize;