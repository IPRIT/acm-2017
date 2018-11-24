import Sequelize from 'sequelize';
import sequelize from '../sequelize';

let News = sequelize.define('News', {
  id: {
    type: Sequelize.INTEGER.UNSIGNED,
    primaryKey: true,
    autoIncrement: true
  },
  title: {
    type: Sequelize.STRING,
    allowNull: false,
    defaultValue: 'Заголовок новости'
  },
  body: {
    type: Sequelize.TEXT('medium'),
    get() {
      return this.getDataValue('body') || '';
    }
  }
}, {
  paranoid: true,
  engine: 'INNODB',
  getterMethods: {
  },
  defaultScope: {
  }
});

export default News;