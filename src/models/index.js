import Log from 'log4js';
import sequelize from './sequelize';
import User from './User';
import AuthToken from './AuthToken';
import Group from './Group';
import Verdict from './Verdict';
import UserContestEnter from './UserContestEnter';
import Contest from './Contest';
import Problem from './Problem';
import ProblemToContest from './ProblemToContest';
import Message from './Message';
import MessageRead from './MessageRead';
import ChatMessage from './ChatMessage';
import Language from './Language';
import Solution from './Solution';
import SystemAccount from './SystemAccount';
import RatingChange from './RatingChange';
import ProblemVersionControl from './ProblemVersionControl';
import RegisterLink from './RegisterLink';
import News from './News';
import ResetPasswordLink from './ResetPasswordLink';
import { Telegram } from './Telegram';
import Error from './Error';

/*
import {
  OldUser, OldLanguage, OldContest, OldProblem,
  OldProblemToContest, OldUsersToGroups, OldSystemAccount,
  OldUserContestEnter, OldSolution, OldMessage, OldMessageRead
} from './_Old';
*/


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

User.hasMany(ResetPasswordLink, { foreignKey: 'userId', targetKey: 'id' });
ResetPasswordLink.belongsTo(User, { foreignKey: 'userId', targetKey: 'id' });

User.hasMany(Message, { foreignKey: 'userId', targetKey: 'id' });
Message.belongsTo(User, { foreignKey: 'userId', targetKey: 'id' });

Contest.hasMany(Message, { foreignKey: 'contestId', targetKey: 'id' });
Message.belongsTo(Contest, { foreignKey: 'contestId', targetKey: 'id' });

User.belongsToMany(Message, {
  through: MessageRead,
  timestamps: false,
  foreignKey: 'userId'
});
Message.belongsToMany(User, {
  through: MessageRead,
  timestamps: false,
  foreignKey: 'messageId'
});

User.hasMany(MessageRead, { foreignKey: 'userId', targetKey: 'id' });
MessageRead.belongsTo(User, { foreignKey: 'userId', targetKey: 'id' });

Message.hasMany(MessageRead, { foreignKey: 'messageId', targetKey: 'id' });
MessageRead.belongsTo(Message, { foreignKey: 'messageId', targetKey: 'id' });

// --- ChatMessage ---
User.hasMany(ChatMessage, { foreignKey: 'userId', targetKey: 'id' });
ChatMessage.belongsTo(User, { foreignKey: 'userId', targetKey: 'id' });
// ---

User.belongsToMany(Group, {
  through: 'UsersToGroups',
  timestamps: false,
  foreignKey: 'userId'
});
Group.belongsToMany(User, {
  through: 'UsersToGroups',
  timestamps: false,
  foreignKey: 'groupId'
});

Contest.belongsToMany(Group, {
  through: 'GroupsToContests',
  timestamps: false,
  foreignKey: 'contestId'
});
Group.belongsToMany(Contest, {
  through: 'GroupsToContests',
  timestamps: false,
  foreignKey: 'groupId'
});

User.belongsToMany(Contest, {
  through: UserContestEnter,
  foreignKey: 'userId',
  timestamps: false,
  as: 'ContestEnters'
});
Contest.belongsToMany(User, {
  through: UserContestEnter,
  foreignKey: 'contestId',
  timestamps: false,
  as: 'Contestants'
});

Problem.belongsToMany(Contest, {
  through: ProblemToContest,
  foreignKey: 'problemId',
  timestamps: false
});
Contest.belongsToMany(Problem, {
  through: ProblemToContest,
  foreignKey: 'contestId',
  timestamps: false
});

News.belongsToMany(Group, {
  through: 'NewsToGroups',
  timestamps: false,
  foreignKey: 'newsId'
});
Group.belongsToMany(News, {
  through: 'NewsToGroups',
  timestamps: false,
  foreignKey: 'groupId'
});

Problem.hasMany(ProblemToContest, { foreignKey: 'problemId', targetKey: 'id' });
ProblemToContest.belongsTo(Problem, { foreignKey: 'problemId', targetKey: 'id' });

Problem.hasMany(ProblemVersionControl, { foreignKey: 'problemId', targetKey: 'id' });
ProblemVersionControl.belongsTo(Problem, { foreignKey: 'problemId', targetKey: 'id' });

Contest.hasMany(ProblemToContest, { foreignKey: 'contestId', targetKey: 'id' });
ProblemToContest.belongsTo(Contest, { foreignKey: 'contestId', targetKey: 'id' });

User.hasMany(Solution, { foreignKey: 'userId', targetKey: 'id' });
Solution.belongsTo(User, { foreignKey: 'userId', targetKey: 'id' });

User.hasMany(News, { foreignKey: 'authorId', targetKey: 'id' });
News.belongsTo(User, { foreignKey: 'authorId', targetKey: 'id' });

Problem.hasMany(Solution, { foreignKey: 'problemId', targetKey: 'id' });
Solution.belongsTo(Problem, { foreignKey: 'problemId', targetKey: 'id' });

Verdict.hasMany(Solution, { foreignKey: 'verdictId', targetKey: 'id' });
Solution.belongsTo(Verdict, { foreignKey: 'verdictId', targetKey: 'id' });

Contest.hasMany(Solution, { foreignKey: 'contestId', targetKey: 'id' });
Solution.belongsTo(Contest, { foreignKey: 'contestId', targetKey: 'id' });

Language.hasMany(Solution, { foreignKey: 'languageId', targetKey: 'id' });
Solution.belongsTo(Language, { foreignKey: 'languageId', targetKey: 'id' });

Solution.hasOne(Solution, { foreignKey: 'duplicatedFromId', targetKey: 'id', as: 'DuplicatedSolution' });

User.hasMany(Contest, { foreignKey: 'authorId', targetKey: 'id' });
Contest.belongsTo(User, { foreignKey: 'authorId', targetKey: 'id', as: 'Author' });

Contest.hasMany(RatingChange, { foreignKey: 'contestId', targetKey: 'id' });
RatingChange.belongsTo(Contest, { foreignKey: 'contestId', targetKey: 'id' });

User.hasMany(RatingChange, { foreignKey: 'userId', targetKey: 'id' });
RatingChange.belongsTo(User, { foreignKey: 'userId', targetKey: 'id' });

Group.hasMany(RatingChange, { foreignKey: 'groupId', targetKey: 'id' });
RatingChange.belongsTo(Group, { foreignKey: 'groupId', targetKey: 'id' });

Group.hasMany(RegisterLink, { foreignKey: 'groupId', targetKey: 'id' });
RegisterLink.belongsTo(Group, { foreignKey: 'groupId', targetKey: 'id' });

User.hasMany(Group, { foreignKey: 'authorId', targetKey: 'id', as: 'AuthoredGroup' });
Group.belongsTo(User, { foreignKey: 'authorId', targetKey: 'id', as: 'GroupCreator' });

User.hasOne(Telegram, { foreignKey: 'userId', targetKey: 'id' });
Telegram.belongsTo(User, { foreignKey: 'userId', targetKey: 'id' });

ProblemVersionControl.hasMany(ProblemToContest, { foreignKey: 'versionId', targetKey: 'id' });
ProblemToContest.belongsTo(ProblemVersionControl, { foreignKey: 'versionId', targetKey: 'uuid' });

export {
  User, AuthToken, Group, Verdict,
  UserContestEnter, Contest, Problem, ProblemToContest,
  ChatMessage, Message, MessageRead, Solution, Language, SystemAccount, RatingChange,
  ProblemVersionControl, Error, RegisterLink, News, ResetPasswordLink, Telegram

  /*OldUser, OldLanguage, OldContest, OldProblem,
  OldProblemToContest, OldUsersToGroups, OldSystemAccount,
  OldUserContestEnter, OldSolution, OldMessage, OldMessageRead*/
};
