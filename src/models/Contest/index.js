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
  engine: 'INNODB',
  getterMethods: {
    absoluteFreezeTimeMs() {
      return this.startTimeMs + this.relativeFreezeTimeMs;
    },
    absoluteDurationTimeMs() {
      return this.startTimeMs + this.durationTimeMs;
    },
    absolutePracticeDurationTimeMs() {
      return this.absoluteDurationTimeMs + this.practiceDurationTimeMs;
    },
    hasPracticeTime() {
      return !!this.practiceDurationTimeMs;
    },
    status() {
      var curTime = new Date().getTime();
      if (!this.isEnabled) {
        return 'NOT_ENABLED';
      } else if (this.removedAt) {
        return 'REMOVED';
      } else if (this.absolutePracticeDurationTimeMs < curTime) {
        return 'FINISHED';
      } else if (this.absoluteDurationTimeMs <= curTime) {
        return 'PRACTICE';
      } else if (this.absoluteFreezeTimeMs <= curTime) {
        return 'FROZEN';
      } else if (this.startTimeMs > curTime) {
        return 'WAITING';
      } else if (this.startTimeMs <= curTime) {
        return 'RUNNING';
      }
      return 'NOT_ENABLED';
    }
  }
});

export default Contest;