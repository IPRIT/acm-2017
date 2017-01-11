import Sequelize from 'sequelize';
import sequelize from '../sequelize';

let SystemAccount = sequelize.define('SystemAccount', {
  id: {
    type: Sequelize.INTEGER.UNSIGNED,
    primaryKey: true,
    autoIncrement: true
  },
  systemType: {
    type: Sequelize.STRING,
    allowNull: false
  },
  systemLogin: {
    type: Sequelize.STRING,
    allowNull: false
  },
  systemPassword: {
    type: Sequelize.STRING
  },
  systemNickname: {
    type: Sequelize.STRING
  },
  isEnabled: {
    type: Sequelize.BOOLEAN,
    defaultValue: true
  },
  solutionsNumber: {
    type: Sequelize.INTEGER,
    defaultValue: 0
  },
  additionalParams: {
    type: Sequelize.VIRTUAL,
    defaultValue: null
  }
}, {
  timestamps: false,
  engine: 'INNODB',
  indexes: [{
    name: 'system_type_index',
    method: 'BTREE',
    fields: [ 'systemType' ]
  }]
});

export default SystemAccount;