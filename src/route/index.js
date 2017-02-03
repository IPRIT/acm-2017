import express from 'express';

import indexRouter from './index/index';
import cdnRouter from './cdn';
import { repairDb } from '../utils';

import cors from './cors';
import test from './test';
import user from './user';
import contest from './contest';
import admin from './admin';

const router = express.Router();
router.all('*', cors);
router.use('/test', test);
router.use('/user', user);
router.use('/contest', contest);
router.use('/admin', admin);
router.post('/repair', repairDb);

router.all('/*', function(req, res, next) {
  next(new HttpError('Not found', 404));
});

let apiRouter = router;

export {
  apiRouter,
  indexRouter,
  cdnRouter
};