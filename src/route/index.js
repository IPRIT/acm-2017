import express from 'express';
import bodyParser from 'body-parser';
import * as formData from 'express-form-data';
import { HttpError } from '../utils/http-error';

import indexRouter from './index/index';
import cdnRouter from './cdn';
import filesRouter from './files';
import uploadRouter from './upload';
import { canJoinContest, repairDb, rightsAllocator, userRetriever } from '../utils';

import cors from './cors';
import test from './test';
import user from './user';
import contest from './contest';
import chat from './chat';
import news from './news';
import problems from './problems';
import admin from './admin';
import * as adminMethods from "./admin/methods";
import { filePipeRequest } from "./contest/methods";

const multer = require("multer");

const router = express.Router();

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

router.post('/admin/users-groups', [ upload.single('file'), userRetriever, rightsAllocator('moderator') ], adminMethods.createUsersIntoGroupsRequest);
router.post('/contest/:contestId/pipe', [ upload.single('file'), userRetriever, rightsAllocator('user', 'moderator'), canJoinContest('can', 'joined') ], filePipeRequest);


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
router.use('/news', news);
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
  cdnRouter,
  uploadRouter
};