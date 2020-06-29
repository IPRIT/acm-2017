import express from 'express';
import { rightsAllocator, userRetriever } from '../../utils';
import * as news from './methods';

const router = express.Router();

router.get('/', [ userRetriever, rightsAllocator('user', 'moderator') ], news.getNewsRequest);
router.post('/', [ userRetriever, rightsAllocator('moderator') ], news.createNewsRequest);
router.get('/:newsId', [ userRetriever, rightsAllocator('user', 'moderator') ], news.getNewsByIdRequest);
router.post('/:newsId', [ userRetriever, rightsAllocator('moderator') ], news.updateNewsRequest);
router.delete('/:newsId', [ userRetriever, rightsAllocator('moderator') ], news.deleteNewsByIdRequest);

export default router;