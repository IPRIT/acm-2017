import * as models from "../../../models/index";
import Promise from 'bluebird';
import { extractAllParams } from "../../../utils/index";
import { ensureNumber, valueBetween } from "../../../utils";

export function deleteNewsByIdRequest(req, res, next) {
  let params = Object.assign(
    extractAllParams(req)
  );
  return Promise.resolve().then(() => {
    return deleteNewsById( params );
  }).then(result => res.json(result)).catch(next);
}

export async function deleteNewsById(params) {
  let {
    userId, user,
    newsId
  } = params;
  
  if (!user) {
    user = await models.User.findByPrimary(userId);
  }
  if (!user) {
    throw new HttpError('User not found');
  }

  const item = await models.News.findByPrimary( newsId );

  if (item) {
    return item.destroy();
  }
}