import Sequelize from 'sequelize';
import sequelize from '../sequelize';

let MessageRead = sequelize.define('MessageRead', {
  readAtMs: {
    type: Sequelize.BIGINT(15),
    defaultValue: () => new Date().getTime()
  }
}, {
  timestamps: false,
  engine: 'INNODB'
});

export default MessageRead;