import Sequelize from 'sequelize';
import sequelize from '../../sequelize';

let OldUsersToGroups = sequelize.define('OldUsersToGroups', {
  id: {
    type: Sequelize.INTEGER.UNSIGNED,
    primaryKey: true,
    autoIncrement: true
  },
  user_id: {
    type: Sequelize.INTEGER
  },
  group_id: {
    type: Sequelize.INTEGER
  }
}, {
  timestamps: false,
  engine: 'MYISAM'
});

export default OldUsersToGroups;