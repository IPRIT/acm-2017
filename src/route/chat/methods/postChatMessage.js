import * as models from "../../../models/index";
import Promise from 'bluebird';
import * as sockets from '../../../socket/index';
import { extractAllParams } from "../../../utils/index";

export function postChatMessageRequest(req, res, next) {
  let params = Object.assign(
    extractAllParams(req)
  );
  return Promise.resolve().then(() => {
    return postChatMessage(params);
  }).then(result => res.json(result)).catch(next);
}

export async function postChatMessage(params) {
  let {
    userId, user,
    recipientUserId, recipientUser,
    attachments = {},
    message
  } = params;
  
  if (!user) {
    user = await models.User.findByPrimary(userId);
  }
  if (!recipientUser) {
    recipientUser = await models.User.findByPrimary(recipientUserId);
  }
  if (!user || !recipientUser) {
    throw new HttpError('Sender or Peer not found');
  }

  const adminId = 2;
  const admin = await models.User.findByPrimary(adminId);

  if (user.isAdmin) {
    user = admin;
    userId = adminId;
  }
  if (recipientUser.isAdmin) {
    recipientUser = admin;
    recipientUserId = adminId;
  }
  
  let chatMessageInstance = await user.createChatMessage({
    recipientUserId,
    attachments: JSON.stringify(attachments),
    message
  });
  
  let messageObject = {
    author: user.get({ plain: true }),
    recipient: recipientUser.get({ plain: true }),
    message: chatMessageInstance.get({ plain: true })
  };
  
  sockets.emitNewChatMessageEvent({
    userId: recipientUser.id,
    message: messageObject
  });
  
  return messageObject;
}