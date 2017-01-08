import Log from 'log4js';
import sequelize from './sequelize';
import User from './User';
import AuthToken from './AuthToken';
import Group from './Group';
import Verdict from './Verdict';
import UserContestEnter from './UserContestEnter';
import Contest from './Contest';

const log = Log.getLogger('models');

log.info('Models are syncing...');
sequelize.sync(/**{ force: true }/**/).then(() => {
  log.info('Models synced!');
}).catch(log.fatal.bind(log, 'Error:'));

/**
 * Define relatives between models
 */
User.hasMany(AuthToken, { foreignKey: 'userId', targetKey: 'id' });
AuthToken.belongsTo(User, { foreignKey: 'userId', targetKey: 'id' });
User.belongsToMany(Group, { through: 'UsersToGroups', timestamps: false, foreignKey: 'userId' });
Group.belongsToMany(User, { through: 'UsersToGroups', timestamps: false, foreignKey: 'groupId' });

Contest.belongsToMany(Group, { through: 'GroupsToContests', timestamps: false, foreignKey: 'contestId' });
Group.belongsToMany(Contest, { through: 'GroupsToContests', timestamps: false, foreignKey: 'groupId' });

User.belongsToMany(Contest, {
  through: UserContestEnter,
  foreignKey: 'userId',
  timestamps: false
});
Contest.belongsToMany(User, {
  through: UserContestEnter,
  foreignKey: 'contestId',
  timestamps: false
});

export {
  User, AuthToken, Group, Verdict, UserContestEnter, Contest
};
