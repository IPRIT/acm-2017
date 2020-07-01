import Promise from 'bluebird';
import { extractAllParams } from "../../../utils";
import { ResetPasswordLink } from "../../../models";

export function changePasswordRequest(req, res, next) {
  return Promise.resolve().then(() => {
    return changePassword(extractAllParams(req));
  }).then(result => res.json(result)).catch(next);
}

export async function changePassword(params) {
  let {
    resetKey,
    password,
    passwordConfirm,
  } = params;

  if (password !== passwordConfirm) {
    throw new HttpError('Пароли не совпадают');
  }

  if (password.length < 6) {
    throw new HttpError('Пароль не может быть меньше 6 символов');
  }

  const resetLink = await ResetPasswordLink.findOne({
    where: {
      resetKey
    }
  });

  if (!resetLink) {
    throw new HttpError('Данная ссылка уже не действительна');
  }

  const user = await resetLink.getUser();

  await user.update({
    password
  });

  return resetLink.destroy();
}