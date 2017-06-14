import express from 'express';
import { rightsAllocator, userRetriever } from '../../utils';
import * as user from './methods';

const router = express.Router();

router.use('/authenticate', user.authenticator);

router.get('/me', [ userRetriever, rightsAllocator('user') ], user.me);
router.get('/rating', [ userRetriever, rightsAllocator('user') ], user.getRatingHistoryRequest);
router.get('/rating/table', [ userRetriever, rightsAllocator('user') ], user.getRatingTableRequest);
router.get('/solutions', [ userRetriever, rightsAllocator('user') ], user.getSolutionsRequest);

router.get('/:userId', [ userRetriever, rightsAllocator('user') ], user.getUserByIdRequest);
router.get('/:userId/groups', [ userRetriever, rightsAllocator('user') ], user.getUserGroupsRequest);

export default router;