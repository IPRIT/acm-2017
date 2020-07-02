import config from "../../utils/config";
import * as models from "../../models";
import { Telegraf, Telegram } from "telegraf";
import { disconnectTelegram } from "../../route/user/methods";
import { handleReply } from "./helpers";
import { escapeString } from "./helpers/escapeString";

const bot = new Telegraf(config.telegram.token);
export const telegram = new Telegram(config.telegram.token);

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
    return;
  }

  if (message.reply_to_message) {
    return handleReply(ctx, message, message.reply_to_message);
  }
});

bot.catch((err, ctx) => {
  console.log(`Error: ${ctx.updateType}`, err);

  return ctx.reply(
    `Something went wrong :(\n\nTry again.`
  )
});

bot.launch();

export { bot };