import * as models from "../../../models/index";
import Promise from 'bluebird';
import { extractAllParams } from "../../../utils/index";
import { ensureNumber } from "../../../utils";

export function getDialogMessagesRequest(req, res, next) {
  let params = Object.assign(
    extractAllParams(req)
  );
  return Promise.resolve().then(() => {
    return getDialogMessages(params);
  }).then(result => res.json(result)).catch(next);
}

export async function getDialogMessages(params) {
  let {
    userId, user,
    peerUserId, peerUser,
    limit = 20,
    offset = 0
  } = params;

  limit = ensureNumber( limit ) || 10;
  offset = ensureNumber( offset ) || 0;

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

  let options = {
    where: {
      $or: [{
        userId: user.id, // me
        recipientUserId: peerUser.id // peer
      }, {
        userId: peerUser.id, // peer
        recipientUserId: user.id // me
      }]
    },
    limit, offset
  };

  let messages = await models.ChatMessage.findAll(Object.assign({}, options, {
    include: [ models.User ],
    order: 'postAtMs DESC'
  }));

  let messagesNumber = await models.ChatMessage.count(options);

  let readyMessages = [];
  let plainMe = user.get({ plain: true });
  let plainPeer = peerUser.get({ plain: true });
  for (let message of messages) {
    let plainMessage = message.get({ plain: true });
    plainMessage.User = null;
    delete plainMessage.User;
    let messageObject = {
      author: plainMessage.userId === plainMe.id ? plainMe : plainPeer,
      recipient: plainMessage.recipientUserId === plainMe.id ? plainMe : plainPeer,
      message: plainMessage
    };
    readyMessages.push(messageObject);
  }

  return {
    messages: readyMessages,
    messagesNumber
  };
}