import { User, OldUser } from '../../../../../models';
import Log from 'log4js';
import { rememberUser } from "../session-manager";

const log = Log.getLogger('Vk Auth');

export default (req, res, next) => {
  let vkUser = req.vkUser;

  getOrCreateUser(vkUser).then(user => {
    return rememberUser(user);
  }).then(tokenInstance => {
    res.json({
      token: tokenInstance.token
    });
  }).catch(next);
};

function getOrCreateUser(vkUser) {
  let { id } = vkUser;
  return User.findOne({
    where: {
      vkId: id
    }
  }).tap(user => {
    if (user) {
      log.info('Received user:', user && user.get({ plain: true }).fullName);
    }
  }).then(async user => {
    return user || await createUser( vkUser );
  });
}

async function createUser(vkUser) {
  let { id, photo, first_name, last_name, domain } = vkUser;
  log.info('Creating user...:\t', `[id${id}]: [${first_name} ${last_name}]`);
  let newUserObject = {
    firstName: first_name,
    lastName: last_name,
    vkId: id,
    vkDomain: domain || 'id' + id,
    vkPhoto: photo,
    email: null,
    balance: 0,
    searchesNumber: 0,
    downloadsNumber: 0,
    registerTime: new Date()
  };
  return User.create(newUserObject);
}