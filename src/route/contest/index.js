import express from 'express';
import { rightsAllocator, userRetriever, canJoinContest } from '../../utils';
import * as contest from './methods';

const router = express.Router();


router.get('/all', [ userRetriever, rightsAllocator('user') ], contest.getContestsRequest);
router.get('/:contestId', [ userRetriever, rightsAllocator('user'), canJoinContest('can', 'joined') ], contest.getByIdRequest);
router.get('/:contestId/canJoin', [ userRetriever, rightsAllocator('user') ], contest.canJoinRequest);
router.post('/:contestId/join', [ userRetriever, rightsAllocator('user'), canJoinContest('can') ], contest.joinRequest);

router.get('/:contestId/problems', [ userRetriever, rightsAllocator('user'), canJoinContest('can', 'joined') ], contest.getProblemsRequest);
router.get('/:contestId/problems/:symbolIndex', [ userRetriever, rightsAllocator('user'), canJoinContest('can', 'joined') ], contest.getProblemBySymbolIndexRequest);
router.get('/:contestId/problems/:symbolIndex/languages', [ userRetriever, rightsAllocator('user'), canJoinContest('can', 'joined') ], contest.getLanguagesRequest);

router.post('/:contestId/solutions', [ userRetriever, rightsAllocator('user'), canJoinContest('can', 'joined') ], contest.sendSolutionRequest);
router.get('/:contestId/solutions/:solutionsType', [ userRetriever, rightsAllocator('user'), canJoinContest('can', 'joined') ], contest.getSolutionsRequest);

export default router;