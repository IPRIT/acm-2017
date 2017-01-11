import Sequelize from 'sequelize';
import sequelize from '../../sequelize';

let OldLanguage = sequelize.define('OldLanguage', {
  id: {
    type: Sequelize.INTEGER.UNSIGNED,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: Sequelize.STRING
  },
  foreign_id: {
    type: Sequelize.STRING
  },
  system_type: {
    type: Sequelize.STRING
  },
  language_family: {
    type: Sequelize.STRING
  }
}, {
  timestamps: false,
  engine: 'MYISAM',
  indexes: [{
    name: 'system_type_index',
    fields: [ 'system_type' ]
  }]
});

export default OldLanguage;