import * as models from "../../../models";
import Promise from 'bluebird';

export function getMessagesRequest(req, res, next) {
  let params = Object.assign(
    Object.assign(req.params, req.query),
    { user: req.user }
  );
  return Promise.resolve().then(() => {
    return getMessages(params);
  }).then(result => res.json(result)).catch(next);
}

export async function getMessages(params) {
  let {
    contestId, contest,
    userId, user
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
  let admin = await models.User.findByPrimary(2);
  let messages = await contest.getMessages({
    include: [{
      model: models.MessageRead,
      required: false,
      where: {
        userId: user.id
      }
    }, models.User]
  });
  
  let groups = {
    read: [],
    unread: []
  };
  for (let message of messages) {
    let groupName = message.MessageReads.length > 0 ? 'read' : 'unread';
    let messageRead = message.MessageReads[0];
    let messageObject = {
      author: message.User.get({ plain: true }),
      message: {
        id: message.id,
        contestId: contest.id,
        attachments: JSON.parse(message.attachments || '{}'),
        text: message.message,
        postAtMs: message.postAtMs,
        readAtMs: message.MessageReads.length > 0 ? messageRead.readAtMs : null,
        isRead: message.MessageReads.length > 0,
        asAdmin: message.asAdmin
      }
    };
    if (message.asAdmin) {
      messageObject.author = admin.get({ plain: true })
    }
    groups[ groupName ].push( messageObject );
  }
  return groups;
}