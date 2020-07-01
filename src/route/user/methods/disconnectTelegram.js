import Promise from 'bluebird';
import { extractAllParams } from "../../../utils";

export function disconnectTelegramRequest(req, res, next) {
  return Promise.resolve().then(() => {
    return disconnectTelegram(extractAllParams(req), req, res);
  }).then((result) => res.json(result)).catch(next);
}

export async function disconnectTelegram(params, req, res) {
  let {
    user
  } = params;

  if (!user) {
    throw new HttpError('User not found');
  }

  const account = await user.getTelegram();

  if (account) {
    await account.destroy();
  }

  return res && res.redirect('/profile');
}