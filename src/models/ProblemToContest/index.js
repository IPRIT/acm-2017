import Sequelize from 'sequelize';
import sequelize from '../sequelize';

let ProblemToContest = sequelize.define('ProblemToContest', {
  id: {
    type: Sequelize.INTEGER.UNSIGNED,
    primaryKey: true,
    autoIncrement: true
  }
}, {
  timestamps: false,
  engine: 'INNODB'
});

export default ProblemToContest;