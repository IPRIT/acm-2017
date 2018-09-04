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
export function revokeGroupRegisterLinkRequest (req, res, next) {
  return Promise.resolve().then(() => {
    return revokeGroupRegisterLink(
      extractAllParams( req )
    );
  }).then(result => res.json(result)).catch(next);
}

/**
 * @param params
 * @return {Promise<*>}
 */
export async function revokeGroupRegisterLink (params) {
  let {
    linkUuid, link
  } = params;

  if (!link) {
    link = await models.RegisterLink.findByPrimary( linkUuid );
  }

  if (!link) {
    throw new HttpError( 'Такой ссылки не существует' );
  }

  return link.update({
    isActive: false
  });
}