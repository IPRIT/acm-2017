import Promise from 'bluebird';
import * as models from "../../../models/index";
import * as sockets from '../../../socket/index';
import { extractAllParams } from "../../../utils/index";
import { telegram } from "../../../services/telegram";
import { formatUser } from "../../../services/telegram/helpers/formatUser";
import { escapeString } from "../../../services/telegram/helpers/escapeString";
import userGroups from "../../../models/User/userGroups";

const isProduction = process.env.NODE_ENV !== 'development';

export function postChatMessageRequest(req, res, next) {
  let params = Object.assign(
    extractAllParams(req),
    {
      host: req.headers['host']
    }
  );
  return Promise.resolve().then(() => {
    return postChatMessage(params);
  }).then(result => res.json(result)).catch(next);
}

export async function postChatMessage(params) {
  let {
    user, userId = user && user.id,
    recipientUser, recipientUserId = recipientUser && recipientUser.id,
    attachments = {},
    message,
    host
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

  const initiator = user;

  const adminId = 2;
  const admin = await models.User.findByPrimary(adminId);

  if (user.isSupervisor) {
    user = admin;
    userId = adminId;
  }
  if (recipientUser.isSupervisor) {
    recipientUser = admin;
    recipientUserId = adminId;
  }

  if (!recipientUserId) {
    throw new HttpError('recipientUserId is undefined');
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


  await notifyTelegram({
    initiator: initiator.isSupervisor ? admin : initiator,
    recipient: recipientUser,
    message: chatMessageInstance,
    host
  });
  
  return messageObject;
}

async function notifyTelegram(data) {
  let {
    initiator,
    recipient,
    message,
    host
  } = data;

  if (!host || host.startsWith('localhost')) {
    host = 'contest.misis.ru';
  }

  const initiatorTelegram = await initiator.getTelegram();

  const promises = [];
  const text = `${formatUser({
    user: initiator,
    account: initiatorTelegram,
    includeAt: !initiator.isSupervisor,
    host
  })} sent a message:\n\n«${escapeString(message.message)}»\n\nReply the message to answer\\.`;

  if (recipient.isAdmin) {
    const where = {
      accessGroup: {
        $in: [userGroups.groups.admin.mask]
      }
    };

    if (!isProduction) {
      // where.id = 1; // only one account
    }

    const adminUsers = await models.User.findAll({
      include: [{
        model: models.Telegram,
        required: true
      }],
      where
    });

    for (const admin of adminUsers) {
      const account = admin.Telegram;

      if (account && account.telegramId) {
        promises.push(
          telegram.sendMessage(account.telegramId, text, {
            disable_web_page_preview: true,
            parse_mode: "MarkdownV2"
          })
        );
      }
    }
  }

  if (!recipient.isSupervisor) {
    const account = await recipient.getTelegram();

    if (account && account.telegramId) {
      promises.push(
        telegram.sendMessage(account.telegramId, text, {
          disable_web_page_preview: true,
          parse_mode: "MarkdownV2"
        })
      );
    }
  }

  return Promise.all(promises);
}