import { config } from '../../utils';

const defaultErrorMessage = 'Internal Server Error';

export function ClientError(err, req, res, next) {
  if (err.httpCode) {
    console.error('Client Error', err);
    if (req.hasOwnProperty('isJsonRequest') && !req.isJsonRequest) {
      res.status(err.httpCode).render('error/client', {
        message: err.description
      });
    } else {
      res.status(err.httpCode).json({
        error: err
      });
    }
  } else {
    next(err);
  }
}

export function ServerError(err, req, res, next) {
  console.error('Server Error', err);
  if (res.headersSent) {
    return next(err);
  }
  const isDevelopmentMode = process.env.NODE_ENV === 'development';
  let errorMessage = isDevelopmentMode ?
    err && err.message || defaultErrorMessage : defaultErrorMessage;
  let email = config.contact && config.contact.email;
  let mailToUrl = `mailto:${email}`;
  
  if (req.hasOwnProperty('isJsonRequest') && !req.isJsonRequest) {
    res.status(500).render('error/server', {
      message: errorMessage,
      stack: isDevelopmentMode && err.stack || '',
      mailToUrl
    });
  } else {
    res.status(500).json({
      error: {
        description: errorMessage,
        httpCode: 500,
        restParams: err.restParams || {}
      }
    });
  }
}