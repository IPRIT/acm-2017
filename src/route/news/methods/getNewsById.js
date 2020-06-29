import Promise from 'bluebird';
import * as models from "../../../models/index";
import { extractAllParams } from "../../../utils";

export function getNewsByIdRequest(req, res, next) {
  return Promise.resolve().then(() => {
    return getNewsById( extractAllParams(req) );
  }).then(result => res.json(result)).catch(next);
}

export async function getNewsById(params) {
  let {
    userId,
    newsId,
    user
  } = params;
  
  if (!user) {
    user = await models.User.findByPrimary(userId);
  }
  if (!user) {
    throw new HttpError('User not found');
  }

  const news = await models.News.findByPrimary(newsId);

  if (!news) {
    throw new HttpError('News not found');
  }

  const allowed = user.isAdmin;

  const groupsWhere = {};

  if (!allowed) {
    const userGroups = await user.getGroups();

    Object.assign(groupsWhere, {
      id: {
        $in: userGroups.map(group => group.id)
      }
    })
  }

  return models.News.findByPrimary(news.id, {
    include: [{
      model: models.User,
      required: true
    }, {
      model: models.Group,
      required: !allowed,
      where: groupsWhere
    }]
  });
}