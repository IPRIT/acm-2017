import Sequelize from 'sequelize';
import sequelize from '../../sequelize';

let OldContest = sequelize.define('OldContest', {
  id: {
    type: Sequelize.INTEGER.UNSIGNED,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: Sequelize.STRING,
    allowNull: false
  },
  virtual: {
    type: Sequelize.BOOLEAN,
    defaultValue: false
  },
  start_time: {
    type: Sequelize.BIGINT(15).UNSIGNED
  },
  relative_freeze_time: {
    type: Sequelize.BIGINT(15).UNSIGNED
  },
  duration_time: {
    type: Sequelize.BIGINT(15).UNSIGNED
  },
  practice_duration_time: {
    type: Sequelize.BIGINT(15).UNSIGNED
  },
  user_id: {
    type: Sequelize.INTEGER.UNSIGNED
  },
  enabled: {
    type: Sequelize.BOOLEAN
  },
  creation_time: {
    type: Sequelize.BIGINT(15).UNSIGNED
  },
  removed: {
    type: Sequelize.BOOLEAN
  },
  allowed_groups: {
    type: Sequelize.STRING
  }
}, {
  timestamps: false,
  engine: 'MYISAM'
});

export default OldContest;