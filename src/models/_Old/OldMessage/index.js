import Sequelize from 'sequelize';
import sequelize from '../../sequelize';

let OldMessage = sequelize.define('OldMessage', {
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
  as_admin: {
    type: Sequelize.BOOLEAN
  },
  attachments: {
    type: Sequelize.TEXT
  },
  message: {
    type: Sequelize.TEXT
  },
  time: {
    type: Sequelize.BIGINT(15).UNSIGNED
  },
  removed: {
    type: Sequelize.BOOLEAN
  }
}, {
  timestamps: false,
  engine: 'MYISAM'
});

export default OldMessage;