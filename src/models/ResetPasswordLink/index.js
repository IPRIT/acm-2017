import Sequelize from 'sequelize';
import sequelize from '../sequelize';

let ResetPasswordLink = sequelize.define('ResetPasswordLink', {
  uuid: {
    type: Sequelize.UUID,
    defaultValue: Sequelize.UUIDV1,
    primaryKey: true
  },
  resetKey: {
    type: Sequelize.STRING,
    allowNull: false
  },
}, {
  paranoid: true,
  engine: 'INNODB',
  indexes: [{
    name: 'reset_key_index',
    method: 'BTREE',
    fields: [ 'resetKey' ]
  }]
});

export default ResetPasswordLink;