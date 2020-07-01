import Promise from 'bluebird';
import path from 'path';
import Email from 'email-templates';
import { extractAllParams } from "../../../utils";
import { User } from "../../../models";
import config from "../../../utils/config";
import { generateCryptoToken } from "./authenticate/session-manager";

const isProduction = process.env.NODE_ENV !== 'development';

export function forgetPasswordRequest(req, res, next) {
  return Promise.resolve().then(() => {
    return forgetPassword({
      ...extractAllParams(req),
      ...{
        acceptLanguage: req.headers['Accept-Language'],
        host: req.headers['host']
      }
    });
  }).then(result => {
    if (result.contentType) {
      res.set('Content-Type', result.contentType + '; charset=utf-8');

      return res.end(result.content)
    }

    return res.json(result);
  }).catch(next);
}

export async function forgetPassword(params) {
  let {
    login,
    send = isProduction,
    output = false,
    acceptLanguage = 'en',
    language = acceptLanguage.split(',')[0],
    host = 'contest.misis.ru'
  } = params;

  login = (login || '').trim().toLowerCase();

  const user = await User.findOne({
    where: {
      $or: {
        username: login,
        email: login,
      }
    }
  });

  if (!user) {
    throw new HttpError('Пользователя с таким логином или e-mail не существует.');
  }

  if (!user.email) {
    throw new HttpError('У пользователя не привязан e-mail. Обратитесь к администратору.');
  }

  const resetLink = await user.createResetPasswordLink({
    resetKey: await generateCryptoToken()
  });
  const resetUrl = `http://${host}/auth/reset?resetKey=${resetLink.resetKey}`;

  const email = new Email({
    message: {
      from: 'ipritoflex@yandex.ru'
    },
    transport: {
      host: 'smtp.yandex.ru',
      port: 465,
      secure: true,
      auth: {
        user: config.email.login,
        pass: config.email.auth
      }
    },
    send,
    preview: isProduction
      ? false
      : {
      open: {
        app: 'chrome',
        wait: false
      }
    },
    subjectPrefix: isProduction ? false : `[DEV] `,
    juiceResources: {
      preserveImportant: true,
      webResources: {
        relativeTo: path.resolve('app/img'),
        images: true
      }
    }
  });

  const locals = {
    action: (
      language === 'en'
      ? 'Change password for '
      : 'Сменить пароль для '
    ) + user.fullName,
    url: resetUrl
  };

  if (output) {
    return {
      contentType: 'text/html',
      content: await email.render('password/html', locals)
    };
  }

  await email.send({
    template: 'password',
    message: {
      to: user.email
    },
    locals
  });

  return {
    ok: true
  };
}