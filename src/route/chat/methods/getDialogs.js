import * as models from "../../../models/index";
import Sequelize from 'sequelize';
import Promise from 'bluebird';
import { extractAllParams } from "../../../utils/index";

export function getDialogsRequest(req, res, next) {
  let params = Object.assign(
    extractAllParams(req)
  );
  return Promise.resolve().then(() => {
    return getDialogs(params);
  }).then(result => res.json(result)).catch(next);
}

export async function getDialogs(params) {
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
  if (user.isAdmin) {
    user = await models.User.findByPrimary(adminId);
    userId = adminId;
  }

  let myDialogs = await models.ChatMessage.findAll({
    where: {
      userId: user.id
    },
    attributes: [
      'recipientUserId',
      [Sequelize.fn('max', Sequelize.col('id')), '_maxMessageId']
    ],
    group: [ 'recipientUserId' ],
    order: [
      [Sequelize.col('_maxMessageId'), 'DESC']
    ]
  });

  let recipientsDialogs = await models.ChatMessage.findAll({
    where: {
      recipientUserId: user.id
    },
    attributes: [
      'userId',
      [Sequelize.fn('max', Sequelize.col('id')), '_maxMessageId']
    ],
    group: [ 'userId' ],
    order: [
      [Sequelize.col('_maxMessageId'), 'DESC']
    ]
  });

  let mergedDialogs = mergeDialogs(myDialogs, recipientsDialogs);
  let headMessages = await models.ChatMessage.findAll({
    order: 'id DESC',
    where: {
      id: {
        $in: mergedDialogs.map(message => message.messageId)
      }
    }
  });

  let peers = await models.User.findAll({
    where: {
      id: {
        $in: mergedDialogs.map(message => message.peerId)
      }
    }
  });

  let peersMapping = new Map();
  for (let peer of peers) {
    peersMapping.set(peer.id, peer.get({ plain: true }));
  }

  let readyDialogs = [];
  for (let message of headMessages) {
    let plainMessage = message.get({ plain: true });
    let peerId = message.userId === user.id ? message.recipientUserId : message.userId;
    let plainPeer = peersMapping.get(peerId);
    let plainAuthor = peersMapping.get(message.userId);
    let messageObject = {
      peer: plainPeer,
      author: plainAuthor,
      headMessage: plainMessage
    };
    readyDialogs.push(messageObject);
  }

  return readyDialogs;
}

function mergeDialogs(myDialogs, recipientsDialogs) {
  let peersMapping = new Map();

  for (let i = 0; i < myDialogs.length; ++i) {
    let myDialog = myDialogs[i].get({ plain: true });
    if (peersMapping.has(myDialog.recipientUserId)) {
      peersMapping.set(myDialog.recipientUserId,
        Math.max(peersMapping.get(myDialog.recipientUserId), myDialog._maxMessageId)
      );
    } else {
      peersMapping.set(myDialog.recipientUserId, myDialog._maxMessageId);
    }
  }

  for (let i = 0; i < recipientsDialogs.length; ++i) {
    let recipientsDialog = recipientsDialogs[i].get({ plain: true });
    if (peersMapping.has(recipientsDialog.userId)) {
      peersMapping.set(recipientsDialog.userId,
        Math.max(peersMapping.get(recipientsDialog.userId), recipientsDialog._maxMessageId)
      );
    } else {
      peersMapping.set(recipientsDialog.userId, recipientsDialog._maxMessageId);
    }
  }

  return [ ...peersMapping.entries() ].map(entry => {
    return {
      peerId: entry[0],
      messageId: entry[1]
    }
  });
}