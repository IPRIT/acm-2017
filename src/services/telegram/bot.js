import config from "../../utils/config";
import * as models from "../../models";
import { Telegraf, Telegram } from "telegraf";
import { disconnectTelegram } from "../../route/user/methods";
import { handleReply } from "./helpers";
import { escapeString } from "./helpers/escapeString";

const bot = new Telegraf(config.telegram.token);
export const telegram = new Telegram(config.telegram.token);

const isProduction = process.env.NODE_ENV !== 'development';

if (isProduction) {
  // bot.telegram.setWebhook(`https://${config.domain}/tg-webhook`);

  // fetch('https://api.telegram.org/bot114633843:AAEY4WnV8kcCC4jRsvkkDwSjMlHMeKj60-Y/setWebhook', { method: 'POST', headers: {
  //     "Content-Type": "application/x-www-form-urlencoded",
  //   }, body: 'url=https://contest.misis.ru/tg-webhook' }).then(res => res.json()).then(console.log)
} else {
  // bot.startPolling(2, 50, ['message']);
}

bot.use((ctx, next) => {
  const { update: { message } } = ctx;
  const { from } = message || {};

  if (from) {
    ctx.state.from = from;
  }

  return next();
});

bot.use(async (ctx, next) => {
  const { update: { message } } = ctx;
  const { from } = message || {};

  if (!from) {
    return next();
  }

  const telegramId = Number(from.id);

  const account = await models.Telegram.findOne({
    where: {
      telegramId,
    }
  });

  if (account) {
    ctx.state.account = account;
  }

  return next();
});

bot.start(async (ctx) => {
  let {
    startPayload: linkKey,
    state: { from, account },
  } = ctx;

  if (!linkKey || !from) {
    return ctx.replyWithDice();
  }

  if (account) {
    // return ctx.reply('This account already connected');
  }

  account = await models.Telegram.findOne({
    where: {
      linkKey,
    }
  });

  if (!account) {
    return ctx.reply('This token was used');
  }

  const user = await account.getUser();

  if (!user) {
    return ctx.reply('User not found');
  }

  await account.update({
    username: from.username,
    telegramId: from.id,
    linkKey: null,
  });

  return ctx.reply(
    `Welcome, ${user.fullName}!\n\nYour account has been connected to MISIS Acm! 👍`
  );
});

bot.command('me', async (ctx) => {
  const { state: { from } } = ctx;

  const telegramId = Number(from.id);

  const accounts = await models.Telegram.findAll({
    include: [models.User],
    where: {
      telegramId,
    }
  });

  if (!accounts || !accounts.length) {
    return ctx.reply('You are not connected to MISIS Acm.');
  }

  const users = accounts.map(account => escapeString(account.User.fullName));

  return ctx.reply(`*Connected account${accounts.length > 1 ? 's' : ''}*\n\n${users.join('\n')}\n\nTap /disconnect for disconnect${accounts.length > 1 ? ' first' : ''}\\.`, {
    disable_web_page_preview: true,
    parse_mode: "MarkdownV2"
  });
});

bot.command('disconnect', async (ctx) => {
  const { state: { account } } = ctx;

  if (!account) {
    return ctx.reply('You are not connected to MISIS Acm.');
  }

  const user = await account.getUser();

  await disconnectTelegram({ user });

  return ctx.reply(`You successfully disconnected your account from MISIS Acm!`)
});

bot.on('message', (ctx) => {
  const {
    update: {
      message
    },
    state: {
      account
    }
  } = ctx;

  if (!message || !account) {
    return ctx.replyWithDice();
  }

  if (message.reply_to_message) {
    return handleReply(ctx, message, message.reply_to_message);
  }

  return ctx.replyWithDice();
});

bot.catch((err, ctx) => {
  console.log(`Error: ${ctx.updateType}`, err);

  return ctx.reply(
    `Something went wrong :(\n\nTry again.`
  )
});

if (isProduction) {
  bot.launch();
}

export { bot };
