import * as models from '../../../../../models';
import Log from 'log4js';
import { extractAllParams } from '../../../../../utils';
import Promise from 'bluebird';

const log = Log.getLogger('Form Register in Group');

export default (req, res, next) => {
  return Promise.resolve().then(() => {
    return signUpInGroup(
      extractAllParams(req)
    );
  }).then(result => res.json(result))
    .catch(next);
};

async function signUpInGroup(params) {
  let {
    username,
    firstName,
    lastName,
    password,
    groupKey
  } = params;

  let groupIds = [];

  let registerLink = await models.RegisterLink.findOne({
    where: {
      registerKey: groupKey
    }
  });

  if (!registerLink || !registerLink.groupId) {
    throw new HttpError('Ссылка недействительная');
  }

  groupIds.push(registerLink.groupId);

  let user = await models.User.findOne({
    where: {
      username
    }
  });

  if (user) {
    throw new HttpError('Пользователь с таким логином уже существует')
  }

  user = await models.User.create({
    username,
    firstName,
    lastName,
    password
  });
  await user.setGroups(groupIds);
  await registerLink.increment('linkActivatedTimes');

  return user;
}