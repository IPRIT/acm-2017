import Sequelize from 'sequelize';
import sequelize from '../sequelize';

let UserContestEnter = sequelize.define('UserContestEnter', {
  id: {
    type: Sequelize.INTEGER.UNSIGNED,
    primaryKey: true,
    autoIncrement: true
  },
  joinTime: {
    type: Sequelize.DATE,
    allowNull: false,
    defaultValue: () => new Date()
  }
}, {
  timestamps: false,
  engine: 'INNODB'
});

export default UserContestEnter;