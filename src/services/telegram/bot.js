import config from "../../utils/config";
import * as models from "../../models";
import { Telegraf } from "telegraf";
import { disconnectTelegram } from "../../route/user/methods";

const bot = new Telegraf(config.telegram.token);

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
  const {
    startPayload: linkKey,
    state: { from },
  } = ctx;

  if (!linkKey) {
    return ctx.replyWithDice();
  }

  const account = await models.Telegram.findOne({
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
  const { state: { account } } = ctx;

  if (!account) {
    return ctx.reply('You are not connected to MISIS Acm.');
  }

  const user = await account.getUser();

  return ctx.reply(`Connected account: ${user.fullName}.\n\nTap /disconnect for disconnect.`);
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

bot.catch((err, ctx) => {
  console.log(`Error: ${ctx.updateType}`, err);

  return ctx.reply(
    `Something went wrong :(\n\nTry again.`
  )
});

bot.launch();

export { bot };