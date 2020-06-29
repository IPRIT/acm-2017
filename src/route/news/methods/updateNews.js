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
    body = defaultBody,
    groupsIds = []
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
  if (!groupsIds) {
    groupsIds = [];
  }
  groupsIds = [].concat(groupsIds).map(Number);

  if (!news) {
    news = await models.News.findByPrimary( newsId );
  }
  if (!news) {
    throw new HttpError( 'Новость не найдена' );
  }

  if (user.isAdmin && groupsIds.length === 0) {
    const allGroups = await models.Group.findAll({
      order: 'id DESC'
    });

    groupsIds.push(
      ...allGroups.map(group => group.id)
    );
  }

  if (user.isModerator) {
    const userGroups = await user.getGroups();
    const userGroupsIds = userGroups.map(group => group.id);

    const newsGroups = await news.getGroups();
    const newsGroupsIds = newsGroups.map(group => group.id);

    const tmpGroups = newsGroupsIds.filter(id => {
      return !userGroupsIds.includes(id);
    });

    tmpGroups.push(
      ...groupsIds
    );

    groupsIds = tmpGroups;
  }

  await news.update({
    title,
    body
  });

  await news.setGroups(groupsIds);

  return news;
}