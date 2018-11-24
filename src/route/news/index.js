import express from 'express';
import { rightsAllocator, userRetriever } from '../../utils';
import * as news from './methods';

const router = express.Router();

router.get('/', [ userRetriever, rightsAllocator('user') ], news.getNewsRequest);
router.post('/', [ userRetriever, rightsAllocator('admin') ], news.createNewsRequest);
router.get('/:newsId', [ userRetriever, rightsAllocator('user') ], news.getNewsByIdRequest);
router.post('/:newsId', [ userRetriever, rightsAllocator('admin') ], news.updateNewsRequest);

export default router;