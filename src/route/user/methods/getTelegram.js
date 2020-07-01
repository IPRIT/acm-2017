import Promise from 'bluebird';
import { extractAllParams } from "../../../utils";

export function getTelegramRequest(req, res, next) {
  return Promise.resolve().then(() => {
    return getTelegram(extractAllParams(req), req, res);
  }).then((result) => res.json(result)).catch(next);
}

export async function getTelegram(params, req, res) {
  let {
    user
  } = params;

  if (!user) {
    throw new HttpError('User not found');
  }

  return user.getTelegram();
}