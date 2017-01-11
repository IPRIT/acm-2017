import Sequelize from 'sequelize';
import sequelize from '../../sequelize';

let OldUserContestEnter = sequelize.define('OldUserContestEnter', {
  id: {
    type: Sequelize.INTEGER.UNSIGNED,
    primaryKey: true,
    autoIncrement: true
  },
  user_id: {
    type: Sequelize.INTEGER
  },
  contest_id: {
    type: Sequelize.INTEGER
  },
  join_time: {
    type: Sequelize.BIGINT(15).UNSIGNED
  }
}, {
  timestamps: false,
  engine: 'MYISAM'
});

export default OldUserContestEnter;