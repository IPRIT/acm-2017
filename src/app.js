'use strict';

/**
 * Setting up a global http error for handle API errors
 */
import { HttpError } from './utils/http-error';
global.HttpError = HttpError;

var favicon = require('serve-favicon');

import express from 'express';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import bodyParser from 'body-parser';
import session from 'express-session';
import formData from 'express-form-data';
import requestRestrict from 'express-light-limiter';
import { apiRouter, indexRouter, cdnRouter } from './route';
import { config, isJsonRequest } from './utils';
import models from './models';
import path from 'path';
import { ClientError, ServerError } from './route/error/http-error';
import * as systems from './systems';
import polygonRouter from './systems/polygon';

var app = express();

// view engine setup
app.set('views', __dirname + '/views');
app.set('view engine', 'jade');

// uncomment after placing your favicon in /public
//app.use(favicon(__dirname + '/app/img/favicon.ico'));
app.use(morgan('tiny'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(formData.parse());
app.use(formData.stream());
app.use(formData.union());
app.use(cookieParser(config.cookieSecret));
app.enable('trust proxy');
app.use(session({
  secret: config.sessionSecret,
  resave: false,
  saveUninitialized: true
}));
app.use(express.static(path.join(__dirname, '../app')));

//systems.worker.run();

/*
 * Connecting routers
 */
app.get('/partials\/*:filename', function compileStaticTemplate(req, res) {
  var filename = req.params[0];
  if (!filename) return;
  filename = filename.replace(/(\.htm|\.html)$/i, '');
  res.render(`${path.join(__dirname, '../app')}/partials/${filename}`);
});
app.use('/', indexRouter);
app.use('/cdn', [ isJsonRequest(false) ], cdnRouter);
app.use('/api', [ requestRestrict({ error: new HttpError('Too many requests', 429) }) ], apiRouter);
app.use('/polygon', polygonRouter);

app.all('/*', function(req, res, next) {
  // Just send the index.jade for other files to support html5 mode in angular routing
  res.render('index/index');
});

app.use(ClientError);
app.use(ServerError);

// catch 404 and forward to error handler
app.use((req, res, next) => {
  let err = new Error('Страница не найдена');
  err.status = 404;
  res.status(err.status).render('error/client', {
    message: err.message
  });
  next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (process.env.NODE_ENV === 'development') {
  app.use((err, req, res, next) => {
    res.status(err.status || 500);
    console.error(err);
    res.end();
  });
}

// production error handler
// no stacktraces leaked to user
app.use((err, req, res, next) => {
  res.status(err.status || 500);
  res.end();
});

export default app;