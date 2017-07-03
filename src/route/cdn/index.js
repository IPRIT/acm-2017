import express from 'express';
import { isJsonRequest } from '../../utils';

const router = express.Router();

router.use(isJsonRequest(false));

router.all('/images/:name', express.static('cdn'));

router.all('/*', function(req, res, next) {
  next(new HttpError('Not found', 404));
});

export default router;