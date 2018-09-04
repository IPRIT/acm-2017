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
export function getGroupRegisterLinksRequest (req, res, next) {
  return Promise.resolve().then(() => {
    return getGroupRegisterLinks(
      extractAllParams( req )
    );
  }).then(result => res.json(result)).catch(next);
}

/**
 * @param params
 * @return {Promise<*>}
 */
export async function getGroupRegisterLinks (params) {
  let {
    groupId, group
  } = params;

  if (!group) {
    group = await models.Group.findByPrimary(groupId);
  }

  if (!group) {
    throw new HttpError( 'Такой группы не существует' );
  }

  return group.getRegisterLinks({
    where: {
      isActive: true
    }
  });
}