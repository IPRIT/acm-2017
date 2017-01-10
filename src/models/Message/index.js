import Sequelize from 'sequelize';
import sequelize from '../sequelize';

let Message = sequelize.define('Message', {
  id: {
    type: Sequelize.INTEGER.UNSIGNED,
    primaryKey: true,
    autoIncrement: true
  },
  asAdmin: {
    type: Sequelize.BOOLEAN,
    defaultValue: false
  },
  attachments: {
    type: Sequelize.TEXT
  },
  message: {
    type: Sequelize.TEXT
  }
}, {
  paranoid: true,
  engine: 'INNODB'
});

export default Message;