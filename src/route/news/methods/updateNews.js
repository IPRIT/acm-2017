import * as models from "../../../models/index";
import Promise from 'bluebird';
import { extractAllParams } from "../../../utils/index";

export function updateNewsRequest(req, res, next) {
  let params = Object.assign(
    extractAllParams(req)
  );
  return Promise.resolve().then(() => {
    return updateNews( params );
  }).then(result => res.json(result)).catch(next);
}

export async function updateNews(params) {
  const defaultTitle = 'Заголовок новости';
  const defaultBody = 'Текст новости отсутствует';

  let {
    userId, user,
    newsId, news,
    title = defaultTitle,
    body = defaultBody
  } = params;

  if (!user) {
    user = await models.User.findByPrimary(userId);
  }
  if (!user) {
    throw new HttpError('User not found');
  }

  const adminId = 2;
  if (user.isAdmin) {
    user = await models.User.findByPrimary(adminId);
    userId = adminId;
  }

  if (!title) {
    title = defaultTitle;
  }
  if (!body) {
    body = defaultBody;
  }

  if (!news) {
    news = await models.News.findByPrimary( newsId );
  }
  if (!news) {
    throw new HttpError( 'Новость не найдена' );
  }

  return news.update({
    title,
    body
  });
}