import Sequelize from 'sequelize';
import sequelize from '../sequelize';

let Language = sequelize.define('Language', {
  id: {
    type: Sequelize.INTEGER.UNSIGNED,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: Sequelize.STRING,
    allowNull: false
  },
  systemType: {
    type: Sequelize.STRING,
    allowNull: false
  },
  languageFamily: {
    type: Sequelize.STRING
  },
  foreignLanguageId: {
    type: Sequelize.STRING
  },
  nonactive: {
    type: Sequelize.BOOLEAN,
    defaultValue: false
  }
}, {
  timestamps: false,
  engine: 'INNODB',
  indexes: [{
    name: 'system_type_index',
    method: 'BTREE',
    fields: [ 'systemType' ]
  }, {
    name: 'foreign_id_index',
    method: 'BTREE',
    fields: [ 'foreignLanguageId' ]
  }]
});

export default Language;