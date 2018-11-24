import * as models from "../../../models/index";
import Promise from 'bluebird';
import { extractAllParams } from "../../../utils/index";
import { ensureNumber, valueBetween } from "../../../utils";

export function getNewsByIdRequest(req, res, next) {
  let params = Object.assign(
    extractAllParams(req)
  );
  return Promise.resolve().then(() => {
    return getNewsById( params );
  }).then(result => res.json(result)).catch(next);
}

export async function getNewsById(params) {
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

  return models.News.findByPrimary(newsId, {
    include: [{
      model: models.User,
      required: true
    }]
  });
}