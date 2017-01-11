import Sequelize from 'sequelize';
import sequelize from '../../sequelize';

let OldSolution = sequelize.define('OldSolution', {
  id: {
    type: Sequelize.INTEGER.UNSIGNED,
    primaryKey: true,
    autoIncrement: true
  },
  user_id: {
    type: Sequelize.INTEGER
  },
  problem_id: {
    type: Sequelize.INTEGER
  },
  verdict_id: {
    type: Sequelize.INTEGER
  },
  sent_time: {
    type: Sequelize.BIGINT(15).UNSIGNED
  },
  verdict_time: {
    type: Sequelize.BIGINT(15).UNSIGNED
  },
  execution_time: {
    type: Sequelize.FLOAT
  },
  memory: {
    type: Sequelize.INTEGER
  },
  test_num: {
    type: Sequelize.INTEGER
  },
  contest_id: {
    type: Sequelize.INTEGER
  },
  source_code: {
    type: Sequelize.TEXT
  },
  lang_id: {
    type: Sequelize.INTEGER
  },
  ip: {
    type: Sequelize.STRING
  }
}, {
  timestamps: false,
  engine: 'MYISAM'
});

export default OldSolution;