import express from 'express';
import bodyParser from 'body-parser';
import formData from 'express-form-data';
import requestRestrict from 'express-light-limiter';
import { HttpError } from '../utils/http-error';

import indexRouter from './index/index';
import cdnRouter from './cdn';
import filesRouter from './files';
import { repairDb } from '../utils';

import cors from './cors';
import test from './test';
import user from './user';
import contest from './contest';
import chat from './chat';
import problems from './problems';
import admin from './admin';

const router = express.Router();

router.use(bodyParser.json());
router.use(bodyParser.urlencoded({ extended: false }));
router.use(formData.parse());
router.use(formData.stream());
router.use(formData.union());
/*router.use(requestRestrict({
  error: new HttpError('Too many requests', 429),
  maxRequestsPerQuantum: 20000
}));*/

router.all('*', cors);
router.use('/test', test);
router.use('/user', user);
router.use('/contest', contest);
router.use('/chat', chat);
router.use('/problems', problems);
router.use('/admin', admin);
//router.post('/repair', repairDb);

router.all('/*', function(req, res, next) {
  next(new HttpError('Not found', 404));
});

let apiRouter = router;

export {
  apiRouter,
  indexRouter,
  filesRouter,
  cdnRouter
};