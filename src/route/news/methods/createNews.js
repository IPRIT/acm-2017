import * as models from "../../../models/index";
import Promise from 'bluebird';
import { extractAllParams } from "../../../utils/index";

export function createNewsRequest(req, res, next) {
  let params = Object.assign(
    extractAllParams(req)
  );
  return Promise.resolve().then(() => {
    return createNews( params );
  }).then(result => res.json(result)).catch(next);
}

export async function createNews(params) {
  const defaultTitle = 'Заголовок новости';
  const defaultBody = 'Текст новости отсутствует';

  let {
    userId, user,
    title = defaultTitle,
    body = defaultBody
  } = params;
  
  if (!user) {
    user = await models.User.findByPrimary(userId);
  }
  if (!user) {
    throw new HttpError('User not found');
  }

  /*const adminId = 2;
  if (user.isAdmin) {
    user = await models.User.findByPrimary(adminId);
    userId = adminId;
  }*/

  if (!title) {
    title = defaultTitle;
  }
  if (!body) {
    body = defaultBody;
  }

  return user.createNews({
    title,
    body
  });
}