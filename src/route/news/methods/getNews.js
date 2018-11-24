import * as models from "../../../models/index";
import Promise from 'bluebird';
import { extractAllParams } from "../../../utils/index";
import { ensureNumber, valueBetween } from "../../../utils";

export function getNewsRequest(req, res, next) {
  let params = Object.assign(
    extractAllParams(req)
  );
  return Promise.resolve().then(() => {
    return getNews( params );
  }).then(result => res.json(result)).catch(next);
}

export async function getNews(params) {
  const defaultLimit = 3;
  const defaultOffset = 0;

  let {
    userId, user,
    limit = defaultLimit, offset = defaultOffset
  } = params;
  
  if (!user) {
    user = await models.User.findByPrimary(userId);
  }
  if (!user) {
    throw new HttpError('User not found');
  }

  limit = valueBetween( ensureNumber( limit ), 0, 100 );
  offset = valueBetween( ensureNumber( offset ), 0, Infinity );

  return models.News.findAll({
    limit,
    offset,
    include: [{
      model: models.User,
      required: true
    }],
    order: 'id DESC'
  });
}