import * as models from "../../../models/index";
import Promise from 'bluebird';
import { extractAllParams } from "../../../utils/index";
import * as sockets from "../../../socket/index";

export function deleteDialogMessageRequest(req, res, next) {
  let params = Object.assign(
    extractAllParams(req)
  );
  return Promise.resolve().then(() => {
    return deleteDialogMessage(params);
  }).then(result => res.json(result)).catch(next);
}

export async function deleteDialogMessage(params) {
  let {
    userId, user,
    chatMessageIds = []
  } = params;
  
  if (!user) {
    user = await models.User.findByPrimary(userId);
  }
  if (!user) {
    throw new HttpError('You have no permissions');
  }
  if (typeof chatMessageIds === 'string') {
    chatMessageIds = chatMessageIds.split(',')
      .map(val => Number(val))
      .filter(val => !isNaN(val))
  }
  let chatMessages = await models.ChatMessage.findAll({
    where: {
      id: {
        $in: chatMessageIds
      }
    }
  });
  let operatePermission = user.isAdmin || chatMessages.every(message => {
    return message.userId === user.id; // me
  });
  if (!operatePermission) {
    throw new HttpError('Вы не можете удалить выбранные сообщения. Одно или несколько сообщений не являются вашими.', 403);
  }

  if (!chatMessages.length) {
    return [];
  }

  let promises = [];
  for (let message of chatMessages) {
    sockets.emitDeleteChatMessageEvent({
      userId: message.userId,
      recipientUserId: message.recipientUserId,
      message: {
        id: message.id
      }
    });
    promises.push(message.destroy());
  }
  return Promise.all(promises);
}