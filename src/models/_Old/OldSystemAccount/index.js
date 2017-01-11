import Sequelize from 'sequelize';
import sequelize from '../../sequelize';

let OldSystemAccount = sequelize.define('OldSystemAccount', {
  id: {
    type: Sequelize.INTEGER.UNSIGNED,
    primaryKey: true,
    autoIncrement: true
  },
  system_type: {
    type: Sequelize.STRING
  },
  system_login: {
    type: Sequelize.STRING
  },
  system_password: {
    type: Sequelize.STRING
  },
  system_nickname: {
    type: Sequelize.STRING
  },
  enabled: {
    type: Sequelize.BOOLEAN
  },
  solutions: {
    type: Sequelize.INTEGER
  },
  rest_params: {
    type: Sequelize.STRING
  }
}, {
  timestamps: false,
  engine: 'MYISAM'
});

export default OldSystemAccount;