import * as models from "../../../models";
import Promise from 'bluebird';

export function markMessagesAsReadRequest(req, res, next) {
  let params = Object.assign(
    Object.assign(req.params, req.body),
    { user: req.user }
  );
  return Promise.resolve().then(() => {
    return markMessagesAsRead(params);
  }).then(result => res.json(result)).catch(next);
}

export async function markMessagesAsRead(params) {
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
  
  let messages = await contest.getMessages({
    include: [{
      model: models.MessageRead,
      required: false,
      where: {
        userId: user.id
      }
    }, models.User]
  });
  let bulkQueries = messages.filter(message => !message.MessageReads.length)
    .map(message => {
      return {
        userId: user.id,
        messageId: message.id
      }
    });
  return models.MessageRead.bulkCreate(bulkQueries)
}