import Sequelize from 'sequelize';
import sequelize from '../sequelize';
import userGroups from './userGroups';
import { passwordHash } from '../../utils';

let User = sequelize.define('User', {
  id: {
    type: Sequelize.INTEGER.UNSIGNED,
    primaryKey: true,
    autoIncrement: true
  },
  username: {
    type: Sequelize.STRING,
    allowNull: false,
    unique: true
  },
  password: {
    type: Sequelize.STRING,
    allowNull: false,
    set(value) {
      this.setDataValue('password', passwordHash(value));
    },
    get() {
      return '(hidden)';
    }
  },
  email: {
    type: Sequelize.STRING,
    validate: {
      isEmail: true,
    }
  },
  firstName: {
    type: Sequelize.STRING
  },
  lastName: {
    type: Sequelize.STRING
  },
  solvedCount: {
    type: Sequelize.INTEGER,
    defaultValue: 0
  },
  isBan: {
    type: Sequelize.BOOLEAN,
    defaultValue: false
  },
  accessGroup: {
    type: Sequelize.INTEGER,
    defaultValue: userGroups.groups.user.mask,
    get() {
      let mask = this.getDataValue('accessGroup');
      if (this.getDataValue('isBan')) {
        mask = userGroups.groups.locked.mask;
      }
      return userGroups.utils.groupByMask(mask);
    }
  },
  recentActivityTimeMs: {
    type: Sequelize.BIGINT(15).UNSIGNED,
    defaultValue: () => new Date().getTime()
  },
  lastLoggedTimeMs: {
    type: Sequelize.BIGINT(15).UNSIGNED,
    defaultValue: () => new Date().getTime()
  },
  registerTimeMs: {
    type: Sequelize.BIGINT(15).UNSIGNED,
    defaultValue: () => new Date().getTime()
  }
}, {
  getterMethods: {
    fullName() {
      let placeholder = '{firstName} {lastName}';
      return ['firstName', 'lastName'].reduce((placeholder, key) => {
        let regexp = new RegExp(`\{${key}\}`, 'gi');
        return placeholder.replace(regexp, this[ key ]);
      }, placeholder).trim();
    },
    isAdmin() {
      if (!this.accessGroup) {
        return false;
      }
      return userGroups.utils.hasRight(
        this.accessGroup,
        userGroups.groups.admin.mask
      );
    },
    isModerator() {
      if (!this.accessGroup) {
        return false;
      }
      return userGroups.utils.hasRight(
        this.accessGroup,
        userGroups.groups.moderator.mask
      );
    },
    isSupervisor() {
      if (!this.accessGroup) {
        return false;
      }
      return this.isAdmin || this.isModerator;
    }
  },
  setterMethods: {
    fullName(value) {
      let names = (value || '').trim().split(/\s+/);
      while (names.length !== 2) {
        (names.length > 2 ?
          names.pop : names.push.bind(this, '-'))();
      }
      this.setDataValue('firstName', names.slice(0, -1).join(' '));
      this.setDataValue('lastName', names.slice(-1).join(' '));
    }
  },
  paranoid: true,
  engine: 'INNODB',
  indexes: [{
    name: 'username_index',
    method: 'BTREE',
    fields: [ 'username' ]
  }],
  defaultScope: {
    where: {
      $and: {
        isBan: false,
        accessGroup: {
          $ne: userGroups.groups.locked.mask
        }
      }
    }
  },
  scopes: {
    deleted: {
      where: {
        deletedAt: {
          $ne: null
        }
      }
    },
    banned: {
      where: {
        isBan: true
      }
    },
    accessGroup(...args) {
      let groups = userGroups.utils.resolveAllGroups(...args);
      return {
        where: {
          accessGroup: {
            $in: groups.map(group => group.mask)
          }
        }
      }
    }
  },
  instanceMethods: {
    hasRight(mask) {
      return userGroups.utils.hasRight(
        this.accessGroup,
        mask
      );
    },
    arePasswordsEqual(password) {
      return this.getDataValue('password') === password;
    },
    setPasswordHash(hash) {
      this.setDataValue('password', hash);
    },
    getPasswordHash() {
      this.getDataValue('password');
    }
  }
});

export default User;