import Sequelize from 'sequelize';
import sequelize from '../../sequelize';

let OldUser = sequelize.define('OldUser', {
  id: {
    type: Sequelize.INTEGER.UNSIGNED,
    primaryKey: true,
    autoIncrement: true
  },
  username: {
    type: Sequelize.STRING,
    allowNull: false,
    unique: true
  },
  password: {
    type: Sequelize.STRING,
    allowNull: false
  },
  first_name: {
    type: Sequelize.STRING
  },
  last_name: {
    type: Sequelize.STRING
  },
  solved_count: {
    type: Sequelize.INTEGER,
    defaultValue: 0
  },
  access_keys: {
    type: Sequelize.TEXT,
    allowNull: false
  },
  creation_time: {
    type: Sequelize.BIGINT(14).UNSIGNED,
    defaultValue: 0
  },
  last_logged_time: {
    type: Sequelize.BIGINT(14).UNSIGNED,
    defaultValue: 0
  },
  access_level: {
    type: Sequelize.INTEGER,
    defaultValue: 1
  },
  recent_action_time: {
    type: Sequelize.BIGINT(14).UNSIGNED,
    defaultValue: 0
  }
}, {
  timestamps: false,
  engine: 'MYISAM',
  indexes: [{
    name: 'idx_users_access_level',
    fields: [ 'access_level' ]
  }]
});

export default OldUser;