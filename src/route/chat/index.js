import express from 'express';
import { rightsAllocator, userRetriever } from '../../utils';
import * as chat from './methods';

const router = express.Router();

router.post('/chatMessages', [ userRetriever, rightsAllocator('moderator', 'user') ], chat.postChatMessageRequest);
router.delete('/chatMessages', [ userRetriever, rightsAllocator('moderator', 'user') ], chat.deleteDialogMessageRequest);
router.get('/chatMessages', [ userRetriever, rightsAllocator('moderator', 'user') ], chat.getDialogMessagesRequest);
router.get('/chatDialogs', [ userRetriever, rightsAllocator('moderator', 'user') ], chat.getDialogsRequest);
router.post('/chatMessages/read', [ userRetriever, rightsAllocator('moderator', 'user') ], chat.markChatMessagesAsReadRequest);

router.get('/resolvePeer', [ userRetriever, rightsAllocator('moderator', 'user') ], chat.resolvePeerRequest);
router.get('/unreadMessagesNumber', [ userRetriever, rightsAllocator('moderator', 'user') ], chat.getUnreadMessagesNumberRequest);
router.get('/me', [ userRetriever, rightsAllocator('moderator', 'user') ], chat.getMeRequest);

export default router;