import { User } from '../../../../../models';
import Log from 'log4js';
import { rememberUser } from "../session-manager";
import { config, passwordHash } from '../../../../../utils';
import Promise from 'bluebird';

const log = Log.getLogger('Form Auth');

export default (req, res, next) => {
  return Promise.resolve().then(() => {
    return signIn(req, res);
  }).then(token => res.json({ token })).catch(next);
};

async function signIn(req, res) {
  const AUTH_COOKIE_NAME = config.auth.cookieName;
  let { login, password } = req.body;
  
  let user = await User.findOne({
    where: {
      $or: {
        username: login,
        email: login,
      },
      password: passwordHash(password)
    }
  });
  if (!user) {
    throw new HttpError('Wrong login or password', 401);
  }
  log.info('Received user:', user && user.get({ plain: true }).fullName);
  
  const tokenInstance = await rememberUser(user);

  updateSession(res, user, tokenInstance.token);

  req.session.userId = user.id;

  await user.update({
    lastLoggedTimeMs: Date.now()
  });

  return tokenInstance.token;
}

export function updateSession(res, user, token) {
  if (!token) {
    return;
  }
  const AUTH_COOKIE_NAME = config.auth.cookieName;
  const expires = user.isSupervisor
    ? new Date(Date.now() + 1e3 * 1800)
    : new Date(Date.now() + 1e3 * 3600 * 24 * 365);

  res.cookie(AUTH_COOKIE_NAME, token, {
    expires,
    httpOnly: true
  });
}