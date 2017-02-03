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
  },
  postAtMs: {
    type: Sequelize.BIGINT(15).UNSIGNED,
    defaultValue: () => new Date().getTime()
  }
}, {
  paranoid: true,
  engine: 'INNODB'
});

export default Message;