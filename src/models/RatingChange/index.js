import Sequelize from 'sequelize';
import sequelize from '../sequelize';

let RatingChange = sequelize.define('RatingChange', {
  id: {
    type: Sequelize.INTEGER.UNSIGNED,
    primaryKey: true,
    autoIncrement: true
  },
  realRank: {
    type: Sequelize.INTEGER,
    allowNull: false
  },
  expectedRank: {
    type: Sequelize.FLOAT,
    allowNull: false
  },
  score: {
    type: Sequelize.INTEGER,
    defaultValue: 0
  },
  ratingBefore: {
    type: Sequelize.FLOAT,
    allowNull: false
  },
  ratingAfter: {
    type: Sequelize.FLOAT,
    allowNull: false
  },
  ratingChange: {
    type: Sequelize.FLOAT,
    allowNull: false
  },
  R: {
    type: Sequelize.FLOAT,
    allowNull: false
  },
  versionNumber: {
    type: Sequelize.INTEGER.UNSIGNED,
    defaultValue: 1
  },
  versionTimeStampMs: {
    type: Sequelize.BIGINT(15).UNSIGNED,
    defaultValue: () => Date.now()
  }
}, {
  engine: 'INNODB',
  indexes: [{
    name: 'ratings_index',
    method: 'BTREE',
    fields: [ 'ratingBefore', 'ratingAfter' ]
  }],
  classMethods: {
    getCurrentVersion() {
      return RatingChange.max('versionNumber').then(version => version || 0);
    }
  }
});

export default RatingChange;