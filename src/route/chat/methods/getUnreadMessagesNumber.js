import * as models from "../../../models/index";
import Promise from 'bluebird';
import { extractAllParams } from "../../../utils/index";
import * as sockets from "../../../socket";

export function getUnreadMessagesNumberRequest(req, res, next) {
  let params = Object.assign(
    extractAllParams(req)
  );
  return Promise.resolve().then(() => {
    return getUnreadMessagesNumber(params);
  }).then(_ => res.json(_))
    .catch(next);
}

export async function getUnreadMessagesNumber(params) {
  let {
    userId, user
  } = params;
  
  if (!user) {
    user = await models.User.findByPrimary(userId);
  }
  if (!user) {
    throw new HttpError('User not found');
  }

  const adminId = 2;
  if (user.isSupervisor) {
    user = await models.User.findByPrimary(adminId);
    userId = adminId;
  }
  
  let messagesNumber = await models.ChatMessage.count({
    where: {
      recipientUserId: user.id, // me
      isRead: false // only unread messages
    }
  });
  return {
    messagesNumber
  };
}