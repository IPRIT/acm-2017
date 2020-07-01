import Sequelize from 'sequelize';
import sequelize from '../sequelize';

export const Telegram = sequelize.define('Telegram', {
  id: {
    type: Sequelize.INTEGER.UNSIGNED,
    primaryKey: true,
    autoIncrement: true
  },
  username: {
    type: Sequelize.STRING,
    unique: true
  },
  telegramId: {
    type: Sequelize.BIGINT(15),
  },
  linkKey: {
    type: Sequelize.STRING
  }
}, {
  paranoid: false,
  engine: 'INNODB',
  indexes: [{
    name: 'username_index',
    method: 'BTREE',
    fields: [ 'username' ]
  }, {
    name: 'telegramId_index',
    method: 'BTREE',
    fields: [ 'telegramId' ]
  }]
});