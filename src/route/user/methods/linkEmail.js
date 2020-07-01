import Promise from 'bluebird';
import { extractAllParams } from "../../../utils";
import { ResetPasswordLink, User } from "../../../models";

export function linkEmailRequest(req, res, next) {
  return Promise.resolve().then(() => {
    return linkEmail(extractAllParams(req));
  }).then(result => res.json(result)).catch(next);
}

export async function linkEmail(params) {
  let {
    email,
    user
  } = params;

  if (!email) {
    throw new HttpError('E-mail отстутствует');
  }

  email = email.trim().toLowerCase();

  const emailUser = await User.findOne({
    where: {
      email
    }
  });

  if (emailUser && emailUser.id !== user.id) {
    throw new HttpError('Такой e-mail уже привязан к другому пользователю');
  }

  return user.update({ email });
}