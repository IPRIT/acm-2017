import Sequelize from 'sequelize';
import sequelize from '../sequelize';

let MessageRead = sequelize.define('MessageRead', {
  readAt: {
    type: Sequelize.DATE,
    defaultValue: () => new Date()
  }
}, {
  timestamps: false,
  engine: 'INNODB'
});

export default MessageRead;