import Sequelize from 'sequelize';
import sequelize from '../sequelize';

let ProblemVersionControl = sequelize.define('ProblemVersionControl', {
  uuid: {
    type: Sequelize.UUID,
    defaultValue: Sequelize.UUIDV1,
    primaryKey: true
  },
  versionNumber: {
    type: Sequelize.INTEGER.UNSIGNED,
    defaultValue: 1
  },
  title: {
    type: Sequelize.STRING,
    allowNull: false
  },
  htmlStatement: {
    type: Sequelize.TEXT('medium')
  },
  textStatement: {
    type: Sequelize.TEXT
  },
  attachments: {
    type: Sequelize.TEXT,
    get() {
      let jsonString = this.getDataValue('attachments') || '{}';
      return JSON.parse(jsonString);
    }
  }
}, {
  engine: 'INNODB',
  classMethods: {
    getCurrentVersion(problemId) {
      return ProblemVersionControl.findOne({
        where: {
          problemId
        },
        attributes: [
          [sequelize.fn('max', sequelize.col('versionNumber')), 'versionNumber']
        ]
      }).then(version => version.versionNumber || 0);
    }
  }
});

export default ProblemVersionControl;