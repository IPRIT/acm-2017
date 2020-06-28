import Promise from 'bluebird';
import Log from 'log4js';
import * as models from '../../../../../models';
import { extractAllParams } from '../../../../../utils';

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
    groupKey,
    user
  } = params;

  let groupIds = [];

  let registerLink = await models.RegisterLink.findOne({
    where: {
      registerKey: groupKey
    }
  });

  if (!registerLink || !registerLink.groupId) {
    throw new HttpError( 'Ссылка недействительная' );
  } else if (!registerLink.isActive) {
    throw new HttpError( 'Регистрация по этой ссылке больше невозможна' );
  }

  groupIds.push(registerLink.groupId);

  let registeredUser = user;

  if (!registeredUser) {
    registeredUser = await models.User.findOne({
      where: {
        username
      }
    });

    if (user) {
      throw new HttpError('Пользователь с таким логином уже существует')
    }

    registeredUser = await models.User.create({
      username,
      firstName,
      lastName,
      password
    });
  }

  let groups = [];
  if (user) {
    groups = await user.getGroups();

    groupIds.push(
      ...groups.map(group => group.id)
    );
  }

  await registeredUser.setGroups(groupIds);
  await registerLink.increment('linkActivatedTimes');

  return user;
}