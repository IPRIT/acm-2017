import Sequelize from 'sequelize';
import sequelize from '../sequelize';

let Solution = sequelize.define('Solution', {
  id: {
    type: Sequelize.INTEGER.UNSIGNED,
    primaryKey: true,
    autoIncrement: true
  },
  sentAtMs: {
    type: Sequelize.BIGINT(15).UNSIGNED,
    defaultValue: () => new Date().getTime()
  },
  verdictGotAtMs: {
    type: Sequelize.BIGINT(15).UNSIGNED
  },
  retriesNumber: {
    type: Sequelize.INTEGER,
    defaultValue: 0
  },
  nextAttemptWillBeAtMs: {
    type: Sequelize.BIGINT(15).UNSIGNED
  },
  testNumber: {
    type: Sequelize.INTEGER,
    defaultValue: 0
  },
  executionTime: {
    type: Sequelize.FLOAT,
    defaultValue: 0
  },
  memory: {
    type: Sequelize.INTEGER,
    defaultValue: 0
  },
  sourceCode: {
    type: Sequelize.TEXT
  },
  ip: {
    type: Sequelize.STRING
  },
  internalSolutionIdentifier: {
    type: Sequelize.STRING
  }
}, {
  paranoid: true,
  engine: 'INNODB',
  indexes: [{
    name: 'sent_time_index',
    fields: [ 'sentAtMs' ]
  }, {
    name: 'next_attempt_time_index',
    fields: [ 'nextAttemptWillBeAtMs' ]
  }, {
    name: 'verdict_time_index',
    fields: [ 'verdictGotAtMs' ]
  }, {
    name: 'solution_identifier_index',
    fields: [ 'internalSolutionIdentifier' ]
  }]
});

export default Solution;