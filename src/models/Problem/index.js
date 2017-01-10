import Sequelize from 'sequelize';
import sequelize from '../sequelize';

let Problem = sequelize.define('Problem', {
  id: {
    type: Sequelize.INTEGER.UNSIGNED,
    primaryKey: true,
    autoIncrement: true
  },
  systemType: {
    type: Sequelize.STRING,
    allowNull: false
  },
  foreignProblemIdentifier: {
    type: Sequelize.STRING
  },
  title: {
    type: Sequelize.STRING,
    allowNull: false
  },
  htmlStatement: {
    type: Sequelize.TEXT
  },
  textStatement: {
    type: Sequelize.TEXT
  },
  attachments: {
    type: Sequelize.TEXT
  }
}, {
  timestamps: false,
  engine: 'INNODB',
  indexes: [{
    name: 'system_type_index',
    method: 'BTREE',
    fields: [ 'systemType' ]
  }, {
    name: 'foreign_problem_index',
    method: 'BTREE',
    fields: [ 'foreignProblemIdentifier' ]
  }]
});

export default Problem;