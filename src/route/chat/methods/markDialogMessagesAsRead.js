import * as models from "../../../models/index";
import Promise from 'bluebird';
import { extractAllParams } from "../../../utils/index";
import * as sockets from "../../../socket";

export function markChatMessagesAsReadRequest(req, res, next) {
  let params = Object.assign(
    extractAllParams(req)
  );
  return Promise.resolve().then(() => {
    return markChatMessagesAsRead(params);
  }).then(_ => res.json({ success: true }))
    .catch(next);
}

export async function markChatMessagesAsRead(params) {
  let {
    userId, user,
    peerUserId, peerUser
  } = params;
  
  if (!user) {
    user = await models.User.findByPrimary(userId);
  }
  if (!peerUser) {
    peerUser = await models.User.findByPrimary(peerUserId);
  }
  if (!user || !peerUser) {
    throw new HttpError('User not found');
  }

  const adminId = 2;
  const admin = await models.User.findByPrimary(adminId);

  if (user.isSupervisor) {
    user = admin;
    userId = adminId;
  }
  if (peerUser.isSupervisor) {
    peerUser = admin;
    peerUserId = adminId;
  }
  
  let messages = await models.ChatMessage.findAll({
    include: [ models.User ],
    where: {
      userId: peerUser.id, // author
      recipientUserId: user.id, // me
      isRead: false // only unread messages
    }
  });
  let promises = [];
  for (let message of messages) {
    sockets.emitReadChatMessageEvent({
      userId: message.userId,
      recipientUserId: message.recipientUserId,
      message: {
        id: message.id
      }
    });
    promises.push( message.update({ isRead: true }) );
  }
  return Promise.all(promises);
}