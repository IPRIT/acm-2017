import Sequelize from 'sequelize';
import sequelize from '../sequelize';

let RegisterLink = sequelize.define('RegisterLink', {
  uuid: {
    type: Sequelize.UUID,
    defaultValue: Sequelize.UUIDV1,
    primaryKey: true
  },
  registerKey: {
    type: Sequelize.STRING,
    allowNull: false
  },
  linkActivatedTimes: {
    type: Sequelize.INTEGER,
    defaultValue: 0
  },
  createdAtMs: {
    type: Sequelize.BIGINT(15).UNSIGNED,
    defaultValue: () => Date.now()
  }
}, {
  paranoid: true,
  engine: 'INNODB',
  indexes: [{
    name: 'register_key_index',
    method: 'BTREE',
    fields: [ 'registerKey' ]
  }]
});

export default RegisterLink;