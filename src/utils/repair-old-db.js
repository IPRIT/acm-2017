import * as models from '../models';
import Promise from 'bluebird';

export default async (req, res, next) => {
  let startTime = new Date();
  
  Promise.resolve().then(() => {
    return repairDb(req, res, next);
  }).then(success).catch(console.error.bind(console));
  
  res.json({
    result: 'success'
  });
  
  function success() {
    console.log(`Repairing has been finished: Elapsed time: ${((new Date().getTime() - startTime.getTime()) / 1000).toFixed(3)} s.`);
  }
};

async function repairDb() {
  //await repairUsers();
  //await repairLanguages();
  //await repairContests();
  //await repairProblems();
  //await repairProblemsToContests();
  //await repairUsersToGroups();
  //await repairSystemAccounts();
  /*await repairUserContestEnters();
  await repairSolutions();
  await repairMessages();*/
}

async function repairUsers() {
  console.info(`Repairing users...`);
  let oldUsers = await models.OldUser.findAll();
  if (!oldUsers) {
    throw new HttpError();
  }
  oldUsers.forEach(async oldUser => {
    let {
      id, username, password, first_name, last_name, creation_time,
      last_logged_time, access_level, recent_action_time
    } = oldUser;
    let user = await models.User.create({
      id, username, password,
      firstName: first_name,
      lastName: last_name,
      accessGroup: access_level === 1 ? 0x100 : 0x1000,
      recentActivityTimeMs: recent_action_time,
      lastLoggedTimeMs: last_logged_time,
      registerTimeMs: creation_time
    });
    user.setPasswordHash(password);
    await user.save();
  });
  await Promise.resolve().delay(1000);
}

async function repairLanguages() {
  console.info(`Repairing languages...`);
  let oldLanguages = await models.OldLanguage.findAll();
  if (!oldLanguages) {
    throw new HttpError();
  }
  oldLanguages.forEach(async oldLanguage => {
    let {
      id, name, foreign_id, system_type, language_family
    } = oldLanguage;
    await models.Language.create({
      id, name,
      systemType: system_type,
      languageFamily: language_family,
      foreignLanguageId: foreign_id
    });
  });
  await Promise.resolve().delay(1000);
}

async function repairContests() {
  console.info(`Repairing contests...`);
  let oldContests = await models.OldContest.findAll();
  if (!oldContests) {
    throw new HttpError();
  }
  for (let oldContest of oldContests) {
    let {
      id, name, start_time, relative_freeze_time,
      duration_time, practice_duration_time, user_id, enabled,
      creation_time, removed, allowed_groups
    } = oldContest;
    let contest = await models.Contest.create({
      id, name,
      startTimeMs: start_time,
      relativeFreezeTimeMs: relative_freeze_time,
      durationTimeMs: duration_time,
      practiceDurationTimeMs: practice_duration_time,
      isEnabled: enabled,
      isSuspended: removed,
      createdAt: new Date(creation_time),
      updatedAt: new Date(creation_time),
      authorId: user_id
    });
    allowed_groups = (allowed_groups || '').split(',').map(Number);
    for (let groupId of allowed_groups) {
      let group = await models.Group.findByPrimary(groupId);
      await contest.addGroup(group);
    }
  }
  await Promise.resolve().delay(1000);
}

async function repairProblems() {
  console.info(`Repairing problems...`);
  let oldProblems = await models.OldProblem.findAll();
  if (!oldProblems) {
    throw new HttpError();
  }
  let index = 0;
  for (let oldProblem of oldProblems) {
    let {
      id, system_type, foreign_problem_id, title, formatted_text,
      text, creation_time, attachments
    } = oldProblem;
    await models.Problem.create({
      id, title,
      systemType: system_type,
      foreignProblemIdentifier: foreign_problem_id,
      htmlStatement: formatted_text,
      textStatement: text,
      attachments,
      createdAt: new Date(creation_time),
      updatedAt: new Date(creation_time)
    });
    ++index;
    if (!(index % 1000)) {
      console.info('Resting...');
      await Promise.resolve().delay(1000);
    }
  }
  await Promise.resolve().delay(1000);
}

async function repairProblemsToContests() {
  console.info(`Repairing problems to contests...`);
  let oldProblemsToContests = await models.OldProblemToContest.findAll();
  if (!oldProblemsToContests) {
    throw new HttpError();
  }
  for (let oldEntity of oldProblemsToContests) {
    let {
      id, contest_id, problem_id
    } = oldEntity;
    await models.ProblemToContest.create({
      id,
      contestId: contest_id,
      problemId: problem_id
    });
  }
  await Promise.resolve().delay(1000);
}

async function repairUsersToGroups() {
  console.info(`Repairing users to groups...`);
  let oldUsersToGroups = await models.OldUsersToGroups.findAll();
  if (!oldUsersToGroups) {
    throw new HttpError();
  }
  for (let oldEntity of oldUsersToGroups) {
    let {
      user_id, group_id
    } = oldEntity;
    let user = await models.User.findByPrimary(user_id);
    let group = await models.Group.findByPrimary(group_id);
    if (!user || !group) {
      continue;
    }
    await user.addGroup(group);
  }
  await Promise.resolve().delay(1000);
}

async function repairSystemAccounts() {
  console.info(`Repairing system accounts...`);
  let oldEntities = await models.OldSystemAccount.findAll();
  if (!oldEntities) {
    throw new HttpError();
  }
  for (let oldEntity of oldEntities) {
    let {
      id, system_type, system_login, system_password,
      system_nickname, enabled, solutions, rest_params
    } = oldEntity;
    await models.SystemAccount.create({
      id,
      systemType: system_type,
      systemLogin: system_login,
      systemPassword: system_password,
      systemNickname: system_nickname,
      isEnabled: enabled,
      solutionsNumber: solutions
    });
  }
  await Promise.resolve().delay(1000);
}

async function repairUserContestEnters() {
  console.info(`Repairing user contest enters...`);
  let oldEntities = await models.OldUserContestEnter.findAll();
  if (!oldEntities) {
    throw new HttpError();
  }
  for (let oldEntity of oldEntities) {
    let {
      id, user_id, contest_id, join_time
    } = oldEntity;
    try {
      await models.UserContestEnter.create({
        id,
        joinTimeMs: join_time,
        userId: user_id,
        contestId: contest_id
      });
    } catch(err) {
      console.error(oldEntity.get({ plain: true }));
    }
  }
  await Promise.resolve().delay(1000);
}

async function repairSolutions() {
  console.info(`Repairing solutions...`);
  let oldEntities = await models.OldSolution.findAll();
  if (!oldEntities) {
    throw new HttpError();
  }
  let index = 0;
  for (let oldEntity of oldEntities) {
    let {
      id, user_id, problem_id, verdict_id, sent_time, verdict_time,
      execution_time, memory, test_num, contest_id, source_code, lang_id, ip
    } = oldEntity;
    try {
      await models.Solution.create({
        id,
        sentAtMs: sent_time,
        verdictGotAtMs: verdict_time,
        testNumber: test_num,
        executionTime: execution_time,
        memory,
        sourceCode: source_code,
        ip,
        createdAt: new Date(sent_time),
        updatedAt: new Date(sent_time),
        userId: user_id,
        problemId: problem_id,
        verdictId: verdict_id === 0 ? null : verdict_id,
        contestId: contest_id,
        languageId: lang_id
      });
      ++index;
      if (!(index % 1000)) {
        console.info('Resting...');
        await Promise.resolve().delay(1000);
      }
    } catch(err) {
      console.error(oldEntity.get({ plain: true }));
    }
  }
  await Promise.resolve().delay(1000);
}

async function repairMessages() {
  console.info(`Repairing messages...`);
  let oldEntities = await models.OldMessage.findAll();
  if (!oldEntities) {
    throw new HttpError();
  }
  for (let oldEntity of oldEntities) {
    let {
      id, user_id, contest_id, as_admin, attachments,
      message, time, removed
    } = oldEntity;
    try {
      let messageInstance = await models.Message.create({
        id,
        asAdmin: as_admin,
        attachments,
        message,
        postAtMs: time,
        createdAt: new Date(time),
        updatedAt: new Date(time),
        deletedAt: removed ? Date.now() : null,
        userId: user_id,
        contestId: contest_id
      });
      let messageReads = await models.OldMessageRead.findAll({
        where: {
          message_id: messageInstance.id
        },
        attributes: [ `message_id`, `user_id`, `time_read` ]
      });
      for (let messageRead of messageReads) {
        let {
          message_id, user_id, time_read
        } = messageRead;
        await models.MessageRead.create({
          readAtMs: time_read,
          userId: user_id,
          messageId: message_id
        });
      }
    } catch(err) {
      console.error(err, oldEntity.get({ plain: true }));
    }
  }
  await Promise.resolve().delay(1000);
}