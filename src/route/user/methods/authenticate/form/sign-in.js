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
      username: login,
      password: passwordHash(password)
    }
  });
  if (!user) {
    throw new HttpError('Wrong login or password', 401);
  }
  log.info('Received user:', user && user.get({ plain: true }).fullName);
  
  let tokenInstance = await rememberUser(user);
  res.cookie(AUTH_COOKIE_NAME, tokenInstance.token, {
    expires: new Date(Date.now() + 1e3 * 3600 * 24 * 365),
    httpOnly: true
  });
  req.session.userId = user.id;
  await user.update({
    lastLoggedTimeMs: Date.now()
  });
  return tokenInstance.token;
}