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
    body = defaultBody,
    groupsIds = []
  } = params;
  
  if (!user) {
    user = await models.User.findByPrimary(userId);
  }
  if (!user) {
    throw new HttpError('User not found');
  }

  if (!title) {
    title = defaultTitle;
  }
  if (!body) {
    body = defaultBody;
  }
  if (!groupsIds) {
    groupsIds = [];
  }
  groupsIds = [].concat(groupsIds).map(Number);

  if (user.isAdmin && groupsIds.length === 0) {
    const allGroups = await models.Group.findAll({
      order: 'id DESC'
    });

    groupsIds.push(
      ...allGroups.map(group => group.id)
    );
  }

  const news = await user.createNews({
    title,
    body
  });

  if (groupsIds.length) {
    await news.setGroups(groupsIds);
  }

  return news;
}