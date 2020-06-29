import express from 'express';
import { rightsAllocator, userRetriever } from '../../utils';
import * as user from './methods';

const router = express.Router();

router.use('/authenticate', user.authenticator);

router.get('/me', [ userRetriever, rightsAllocator('user', 'moderator') ], user.me);
router.get('/token', [ userRetriever, rightsAllocator('user', 'moderator') ], user.token);
router.get('/rating', [ userRetriever, rightsAllocator('user', 'moderator') ], user.getRatingHistoryRequest);
router.get('/rating/table', [ userRetriever, rightsAllocator('user', 'moderator') ], user.getRatingTableRequest);
router.get('/solutions', [ userRetriever, rightsAllocator('user', 'moderator') ], user.getSolutionsRequest);
router.get('/password/reset', user.forgetPasswordRequest);

router.get('/:userId', [ userRetriever, rightsAllocator('user', 'moderator') ], user.getUserByIdRequest);
router.get('/:userId/groups', [ userRetriever, rightsAllocator('user', 'moderator') ], user.getUserGroupsRequest);

export default router;