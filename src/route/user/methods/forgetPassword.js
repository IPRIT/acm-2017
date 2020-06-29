import Promise from 'bluebird';
import Email from 'email-templates';
import { extractAllParams } from "../../../utils";
import { User } from "../../../models";

const isProduction = process.env.NODE_ENV !== 'development';

export function forgetPasswordRequest(req, res, next) {
  return Promise.resolve().then(() => {
    return forgetPassword(
      extractAllParams(req)
    );
  }).then(result => res.json(result)).catch(next);
}

export async function forgetPassword(params) {
  let {
    login
  } = params;

  login = (login || '').trim();

  const user = await User.findOne({
    where: {
      $or: {
        username: login,
        email: login,
      }
    }
  });

  if (!user) {
    throw new HttpError('Пользователя с таким логином или e-mail не существует');
  }

  if (!user.email) {
    return {
      ok: true
    };
  }

  const email = new Email({
    message: {
      from: 'ipritoflex@ya.ru'
    },
    transport: {
      jsonTransport: true
    },
    send: true,
    preview: isProduction
      ? false
      : {
      open: {
        app: 'chrome',
        wait: false
      }
    },
    subjectPrefix: isProduction ? false : `[DEV] `
  });

  email.send({
    template: 'password',
    message: {
      to: user.email
    },
    locals: {
      url: 'https://yandex.ru'
    }
  })
  .then(res => {
    console.log('res.originalMessage', res.originalMessage)
  })
  .catch(console.error);
}