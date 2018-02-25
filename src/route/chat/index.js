import express from 'express';
import { rightsAllocator, userRetriever } from '../../utils';
import * as chat from './methods';

const router = express.Router();

router.post('/chatMessages', [ userRetriever, rightsAllocator('user') ], chat.postChatMessageRequest);
router.delete('/chatMessages', [ userRetriever, rightsAllocator('user') ], chat.deleteDialogMessageRequest);
router.get('/chatMessages', [ userRetriever, rightsAllocator('user') ], chat.getDialogMessagesRequest);
router.get('/chatDialogs', [ userRetriever, rightsAllocator('user') ], chat.getDialogsRequest);
router.post('/chatMessages/read', [ userRetriever, rightsAllocator('user') ], chat.markChatMessagesAsReadRequest);

router.get('/resolvePeer', [ userRetriever, rightsAllocator('user') ], chat.resolvePeerRequest);

export default router;