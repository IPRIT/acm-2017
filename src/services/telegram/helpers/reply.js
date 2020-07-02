import { postChatMessage } from "../../../route/chat/methods";
import { formatUser } from "./formatUser";
import { Telegram, User } from "../../../models";

const MESSAGE_USER_ID_REGEX = /#(\d+)/i;

export async function handleReply(ctx, message, replyMessage) {
  const {
    state: {
      account
    }
  } = ctx;

  const recipientUserId = Number((replyMessage.text || '').match(MESSAGE_USER_ID_REGEX)[1] || 0);

  if (!recipientUserId) {
    return;
  }

  const user = await account.getUser();
  const recipientUser = await User.findByPrimary(recipientUserId, {
    include: [Telegram]
  });

  const params = {
    user,
    recipientUser,
    message: message.text
  };

  await postChatMessage(params);

  const resultMessage = `The message successfully sent to ${formatUser({
    user: recipientUser,
    account: recipientUser.Telegram,
    includeAt: !recipientUser.isSupervisor
  })}\\.`;

  return ctx.reply(resultMessage, {
    disable_notification: true,
    disable_web_page_preview: true,
    parse_mode: "MarkdownV2"
  });
}