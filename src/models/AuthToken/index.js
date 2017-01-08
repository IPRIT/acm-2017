import Sequelize from 'sequelize';
import sequelize from '../sequelize';

let AuthToken = sequelize.define('AuthToken', {
  id: {
    type: Sequelize.INTEGER.UNSIGNED,
    autoIncrement: true,
    primaryKey: true
  },
  token: {
    type: Sequelize.CHAR(96),
    allowNull: false
  },
  isActive: {
    type: Sequelize.BOOLEAN,
    defaultValue: true
  }
}, {
  paranoid: true,
  engine: 'INNODB',
  indexes: [{
    name: 'token_index',
    method: 'BTREE',
    fields: [ 'token' ]
  }],
  defaultScope () {
    return {
      where: {
        isActive: true
      }
    };
  },
  scopes: {
    disabledOnly: {
      where: {
        isActive: false
      }
    }
  }
});

export default AuthToken;