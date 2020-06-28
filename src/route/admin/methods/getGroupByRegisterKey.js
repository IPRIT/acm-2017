import * as models from "../../../models";
import Promise from 'bluebird';
import { extractAllParams } from "../../../utils";
import { HttpError } from "../../../utils/http-error";

/**
 * @param req
 * @param res
 * @param next
 * @return {*}
 */
export function getGroupByRegisterKeyRequest(req, res, next) {
  return Promise.resolve().then(() => {
    return getGroupByRegisterKey(
      extractAllParams( req )
    );
  }).then(result => res.json(result)).catch(next);
}

/**
 * @param params
 * @return {Promise<*>}
 */
export async function getGroupByRegisterKey(params) {
  let {
    registerKey,
    user
  } = params;

  const link = await models.RegisterLink.findOne({
    where: {
      registerKey
    }
  });

  if (!link) {
    throw new HttpError( 'Такой ссылки не существует' );
  }

  const group = await link.getGroup();

  let hasGroup = false;

  if (user) {
    hasGroup = await user.hasGroup(group);
  }

  return Object.assign(
    group.get({ plain: true }),
    { hasGroup }
  );
}