import Sequelize from 'sequelize';
import sequelize from '../sequelize';

let ChatMessage = sequelize.define('ChatMessage', {
  id: {
    type: Sequelize.INTEGER.UNSIGNED,
    primaryKey: true,
    autoIncrement: true
  },
  attachments: {
    type: Sequelize.TEXT,
    get () {
      let jsonString = this.getDataValue('attachments') || '{}';
      return JSON.parse(jsonString);
    }
  },
  message: {
    type: Sequelize.TEXT
  },
  recipientUserId: {
    type: Sequelize.INTEGER
  },
  isRead: {
    type: Sequelize.BOOLEAN,
    defaultValue: false
  },
  postAtMs: {
    type: Sequelize.BIGINT(15).UNSIGNED,
    defaultValue: () => Date.now()
  }
}, {
  paranoid: true,
  engine: 'INNODB'
});

export default ChatMessage;