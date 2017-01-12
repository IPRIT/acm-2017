import Sequelize from 'sequelize';
import sequelize from '../../sequelize';

let OldMessageRead = sequelize.define('OldMessageRead', {
  message_id: {
    type: Sequelize.INTEGER
  },
  user_id: {
    type: Sequelize.INTEGER
  },
  time_read: {
    type: Sequelize.BIGINT(15).UNSIGNED
  }
}, {
  timestamps: false,
  engine: 'MYISAM',
  indexes: [{
    name: 'index',
    method: 'BTREE',
    fields: [ 'message_id', 'user_id' ]
  }]
});

export default OldMessageRead;