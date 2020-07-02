import { User, AuthToken } from '../models';
import Promise from 'bluebird';
import { config } from '../utils';
import { updateSession } from "../route/user/methods/authenticate/form/sign-in";

export default async (req, res, next) => {
  return Promise.resolve().then(() => {
    return retrieveUser(req, res, next);
  }).catch(next);
};

async function retrieveUser(req, res, next) {
  const AUTH_COOKIE_NAME = config.auth.cookieName;
  
  req._ip = req.headers['x-forwarded-for']
    || req.connection.remoteAddress
    || req.headers['x-real-ip']
    || 'Not specified';
  
  let session = req.session || {};
  let cookies = req.cookies;

  let { token = req.query && req.query.token || req.body && req.body.token } = req.params;
  token = req.header('X-Token') || token || cookies[ AUTH_COOKIE_NAME ];
  req.token = token;

  let user;
  
  if (session && session.userId) {
    user = await User.findByPrimary(session.userId);
  } else if (typeof token === 'string') {
    user = await getUser(token);
  } else {
    return next();
  }
  if (!user) {
    return next();
  }

  session.userId = user.id;
  req.user = user;

  await user.update({
    recentActivityTimeMs: Date.now()
  });

  if (user.isSupervisor) {
    updateSession(res, user, token);
  }

  next();
}

export async function getUser(token) {
  let tokenInstance = await AuthToken.findOne({
    where: { token }
  });
  if (!tokenInstance) {
    return null;
  }
  let user = await tokenInstance.getUser({
    attributes: {
      exclude: [ 'deletedAt' ]
    }
  });
  if (!user) {
    return null;
  }
  return user;
}