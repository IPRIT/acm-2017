import Sequelize from 'sequelize';
import sequelize from '../../sequelize';

let OldProblemToContest = sequelize.define('OldProblemToContest', {
  id: {
    type: Sequelize.INTEGER.UNSIGNED,
    primaryKey: true,
    autoIncrement: true
  },
  contest_id: {
    type: Sequelize.INTEGER
  },
  problem_id: {
    type: Sequelize.INTEGER
  }
}, {
  timestamps: false,
  engine: 'MYISAM'
});

export default OldProblemToContest;