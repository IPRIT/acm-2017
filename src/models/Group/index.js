import Sequelize from 'sequelize';
import sequelize from '../sequelize';

let Group = sequelize.define('Group', {
  id: {
    type: Sequelize.INTEGER.UNSIGNED,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: Sequelize.STRING,
    allowNull: false,
    defaultValue: 'Unnamed group'
  },
  color: {
    type: Sequelize.STRING,
    defaultValue: '#CCC'
  }
}, {
  timestamps: false,
  engine: 'INNODB'
});

export default Group;