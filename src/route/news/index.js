import express from 'express';
import { rightsAllocator, userRetriever } from '../../utils';
import * as news from './methods';

const router = express.Router();

router.get('/', [ userRetriever, rightsAllocator('user', 'moderator') ], news.getNewsRequest);
router.post('/', [ userRetriever, rightsAllocator('admin') ], news.createNewsRequest);
router.get('/:newsId', [ userRetriever, rightsAllocator('user', 'moderator') ], news.getNewsByIdRequest);
router.post('/:newsId', [ userRetriever, rightsAllocator('admin') ], news.updateNewsRequest);
router.delete('/:newsId', [ userRetriever, rightsAllocator('admin') ], news.deleteNewsByIdRequest);

export default router;