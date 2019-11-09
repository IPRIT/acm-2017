import Sequelize from 'sequelize';
import sequelize from '../sequelize';
import { parseProblemIdentifier, getEndpoint } from "../../utils/utils";

// codeforces
const CF_HOST = 'codeforces.com';
const CF_PROBLEMSET_PROBLEM_PATH = '/problemset/problem/:contestNumber/:symbolIndex';
const CF_GYM_PROBLEM_PATH = '/gym/:contestNumber/problem/:symbolIndex';

// timus
const TIMUS_HOST = 'acm.timus.ru';
const TIMUS_PROBLEM_PATH = '/problem.aspx';

// acmp
const ACMP_HOST = 'acmp.ru';
const ACMP_PROBLEM_PATH = '/index.asp';

let Problem = sequelize.define('Problem', {
  id: {
    type: Sequelize.INTEGER.UNSIGNED,
    primaryKey: true,
    autoIncrement: true
  },
  systemType: {
    type: Sequelize.STRING,
    allowNull: false
  },
  foreignProblemIdentifier: {
    type: Sequelize.STRING
  },
  title: {
    type: Sequelize.STRING,
    allowNull: false
  },
  htmlStatement: {
    type: Sequelize.TEXT('medium'),
    get() {
      return this.getDataValue('htmlStatement') || '';
    }
  },
  textStatement: {
    type: Sequelize.TEXT('medium'),
    get() {
      return this.getDataValue('textStatement') || '';
    }
  },
  attachments: {
    type: Sequelize.TEXT,
    get() {
      let jsonString = this.getDataValue('attachments') || '{}';
      return JSON.parse(jsonString);
    }
  },
  sourceUrl: {
    type: Sequelize.VIRTUAL,
    get() {
      let systemType = this.getDataValue('systemType');
      let problemIdentifier = this.getDataValue('foreignProblemIdentifier');
      if (systemType === 'cf') {
        let parsedProblemIdentifier = parseProblemIdentifier( problemIdentifier );
        if (problemIdentifier.includes('problemset')) {
          return getEndpoint(CF_HOST, CF_PROBLEMSET_PROBLEM_PATH, parsedProblemIdentifier);
        } else {
          return getEndpoint(CF_HOST, CF_GYM_PROBLEM_PATH, parsedProblemIdentifier);
        }
      } else if (systemType === 'timus') {
        return getEndpoint(TIMUS_HOST, TIMUS_PROBLEM_PATH, {}, {
          space: 1,
          num: problemIdentifier
        });
      } else if (systemType === 'acmp') {
        return getEndpoint(ACMP_HOST, ACMP_PROBLEM_PATH, {}, {
          main: 'task',
          id_task: problemIdentifier
        }, 'https');
      }
    }
  }
}, {
  engine: 'INNODB',
  indexes: [{
    name: 'system_type_index',
    method: 'BTREE',
    fields: [ 'systemType' ]
  }, {
    name: 'foreign_problem_index',
    method: 'BTREE',
    fields: [ 'foreignProblemIdentifier' ]
  }]
});

export default Problem;