import { escapeString } from "./escapeString";

export function formatUser(params) {
  const {
    user,
    account,
    host = 'contest.misis.ru',
    includeAt = true,
  } = params;

  const telegramAt = account && account.username && includeAt ? ` @${account.username}` : '';
  const userIcon = user.isAdmin ? '🤖' : '🧑‍💻';

  return `${userIcon} \\#${user.id} [${escapeString(user.fullName)}](http://${host}/chat/${user.id})${telegramAt}`;
}