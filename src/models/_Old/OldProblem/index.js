import Sequelize from 'sequelize';
import sequelize from '../../sequelize';

let OldProblem = sequelize.define('OldProblem', {
  id: {
    type: Sequelize.INTEGER.UNSIGNED,
    primaryKey: true,
    autoIncrement: true
  },
  system_type: {
    type: Sequelize.STRING
  },
  foreign_problem_id: {
    type: Sequelize.STRING
  },
  title: {
    type: Sequelize.STRING
  },
  formatted_text: {
    type: Sequelize.TEXT
  },
  text: {
    type: Sequelize.TEXT
  },
  input: {
    type: Sequelize.TEXT
  },
  output: {
    type: Sequelize.TEXT
  },
  creation_time: {
    type: Sequelize.BIGINT(15).UNSIGNED
  },
  attachments: {
    type: Sequelize.TEXT
  }
}, {
  timestamps: false,
  engine: 'MYISAM'
});

export default OldProblem;