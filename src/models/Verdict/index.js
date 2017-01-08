import Sequelize from 'sequelize';
import sequelize from '../sequelize';

let Verdict = sequelize.define('Verdict', {
  id: {
    type: Sequelize.INTEGER.UNSIGNED,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: Sequelize.STRING,
    allowNull: false
  },
  scored: {
    type: Sequelize.BOOLEAN,
    defaultValue: true
  }
}, {
  timestamps: false,
  engine: 'INNODB'
});

export default Verdict;