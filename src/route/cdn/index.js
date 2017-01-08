import express from 'express';
import { rightsAllocator, userRetriever, isJsonRequest } from '../../utils';

const router = express.Router();

//router.all('/documents/:name', [ isJsonRequest(false), userRetriever, rightsAllocator('proUser') ], express.static('cdn'));
//router.all('/images/covers/:name', [ isJsonRequest(false) ], express.static('cdn'));
router.all('/images/:name', express.static('cdn'));

router.all('/*', function(req, res, next) {
  next(new HttpError('Not found', 404));
});

export default router;