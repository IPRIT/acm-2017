import * as models from "../../../models";
import Promise from 'bluebird';
import * as sockets from '../../../socket';

export function postMessageRequest(req, res, next) {
  let params = Object.assign(
    Object.assign(req.params, req.body),
    { user: req.user }
  );
  return Promise.resolve().then(() => {
    return postMessage(params);
  }).then(result => res.json(result)).catch(next);
}

export async function postMessage(params) {
  let {
    contestId, contest,
    userId, user,
    asAdmin = true, attachments = {},
    message
  } = params;
  
  if (!user) {
    user = await models.User.findByPrimary(userId);
  }
  if (!contest) {
    contest = await models.Contest.findByPrimary(contestId);
  }
  if (!user || !contest) {
    throw new HttpError('User or Contest not found');
  }
  
  let messageInstance = await contest.createMessage({
    userId: user.id,
    asAdmin,
    attachments: JSON.stringify(attachments),
    message
  });
  
  let messageObject = {
    author: user.get({ plain: true }),
    message: {
      asAdmin,
      attachments,
      text: message,
      time: messageInstance.postAtMs
    }
  };
  if (asAdmin) {
    let adminId = 2;
    let admin = await models.User.findByPrimary(adminId);
    messageObject.author = admin.get({ plain: true });
  }
  
  sockets.emitNewMessageEvent({
    contestId,
    message: messageObject
  });
  
  return messageObject;
}