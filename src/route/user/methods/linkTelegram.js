import Promise from 'bluebird';
import { extractAllParams } from "../../../utils";
import { Telegram } from "../../../models";
import { generateCryptoToken } from "./authenticate/session-manager";

export function linkTelegramRequest(req, res, next) {
  return Promise.resolve().then(() => {
    return linkTelegram(extractAllParams(req), req, res);
  }).catch(next);
}

export async function linkTelegram(params, req, res) {
  let {
    user
  } = params;

  if (!user) {
    throw new HttpError('User not found');
  }

  const [account, created = false] = await Telegram.findOrCreate({
    where: {
      userId: user.id
    },
    defaults: {
      userId: user.id,
      linkKey: await generateCryptoToken(16)
    }
  });

  if (!account.linkKey) {
    return res.redirect('/profile');
  }

  const connectUrl = `https://t.me/misis_bot?start=${account.linkKey}`;

  res.redirect(connectUrl);
}