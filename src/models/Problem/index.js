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
    type: Sequelize.TEXT('medium'),
    get() {
      return this.getDataValue('htmlStatement') || '';
    }
  },
  textStatement: {
    type: Sequelize.TEXT,
    get() {
      return this.getDataValue('textStatement') || '';
    }
  },
  attachments: {
    type: Sequelize.TEXT,
    get() {
      let jsonString = this.getDataValue('attachments') || '{}';
      return JSON.parse(jsonString);
    }
  }
}, {
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