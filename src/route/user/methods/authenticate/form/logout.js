import { config } from '../../../../../utils';
import Promise from 'bluebird';

export default (req, res, next) => {
  return Promise.resolve().then(() => {
    return logout(req, res);
  }).then(result => res.json({ result })).catch(next);
};

async function logout(req, res) {
  const AUTH_COOKIE_NAME = config.auth.cookieName;
  
  res.cookie(AUTH_COOKIE_NAME, '', {
    expires: new Date(Date.now() - 1e3 * 3600 * 24 * 365),
    httpOnly: true
  });
  delete req.session.userId;
  return true;
}