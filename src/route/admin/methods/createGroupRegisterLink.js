import * as models from "../../../models";
import Promise from 'bluebird';
import { extractAllParams } from "../../../utils";
import { HttpError } from "../../../utils/http-error";
import crypto from 'crypto';

export function createGroupRegisterLinkRequest(req, res, next) {
  return Promise.resolve().then(() => {
    return createGroupRegisterLink(
      extractAllParams(req)
    );
  }).then(result => res.json(result)).catch(next);
}

export async function createGroupRegisterLink(params) {
  let {
    groupId, group
  } = params;

  if (!group) {
    group = await models.Group.findByPrimary(groupId);
  }

  if (!group) {
    throw new HttpError('Такой группы не существует');
  }

  return group.createRegisterLink({
    registerKey: await generateCryptoToken()
  });
}

function generateCryptoToken(bufferLength = 48) {
  let getRandomBytes = Promise.promisify(crypto.randomBytes);
  return getRandomBytes(bufferLength).then(buffer => {
    return buffer.toString('hex');
  });
}