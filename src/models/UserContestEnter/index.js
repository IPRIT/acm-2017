import Sequelize from 'sequelize';
import sequelize from '../sequelize';

let UserContestEnter = sequelize.define('UserContestEnter', {
  id: {
    type: Sequelize.INTEGER.UNSIGNED,
    primaryKey: true,
    autoIncrement: true
  },
  joinTimeMs: {
    type: Sequelize.BIGINT(15).UNSIGNED,
    defaultValue: () => new Date().getTime(),
    allowNull: false
  }
}, {
  timestamps: false,
  engine: 'INNODB'
});

export default UserContestEnter;