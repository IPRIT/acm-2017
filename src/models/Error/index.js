import Sequelize from 'sequelize';
import sequelize from '../sequelize';

let Error = sequelize.define('Error', {
  id: {
    type: Sequelize.INTEGER.UNSIGNED,
    primaryKey: true,
    autoIncrement: true
  },
  errorTrace: {
    type: Sequelize.TEXT('medium')
  }
}, {
  engine: 'INNODB'
});

export default Error;