import Sequelize from 'sequelize';
import sequelize from '../sequelize';

let Contest = sequelize.define('Contest', {
  id: {
    type: Sequelize.INTEGER.UNSIGNED,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: Sequelize.STRING,
    allowNull: false,
    defaultValue: 'Unnamed contest'
  },
  startTimeMs: {
    type: Sequelize.BIGINT(15),
    defaultValue: 0
  },
  relativeFreezeTimeMs: {
    type: Sequelize.BIGINT(15),
    defaultValue: 0
  },
  durationTimeMs: {
    type: Sequelize.BIGINT(15),
    defaultValue: 5 * 60 * 60 * 1000
  },
  practiceDurationTimeMs: {
    type: Sequelize.BIGINT(15),
    defaultValue: 0
  },
  isEnabled: {
    type: Sequelize.BOOLEAN,
    defaultValue: true
  }
}, {
  paranoid: true,
  engine: 'INNODB'
});

export default Contest;