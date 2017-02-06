import express from 'express';
import { rightsAllocator, userRetriever } from '../../utils';
import * as adminMethods from './methods';

const router = express.Router();


router.post('/ratingTable', [ userRetriever, rightsAllocator('admin') ], adminMethods.getRatingTableRequest);

router.get('/groups', [ userRetriever, rightsAllocator('admin') ], adminMethods.searchGroupsRequest);

router.get('/problems', [ userRetriever, rightsAllocator('admin') ], adminMethods.searchProblemsRequest);
router.get('/problems/:problemId', [ userRetriever, rightsAllocator('admin') ], adminMethods.getProblemRequest);
router.post('/problems/:problemId', [ userRetriever, rightsAllocator('admin') ], adminMethods.updateProblemRequest);
router.post('/problems/new/ejudge', [ userRetriever, rightsAllocator('admin') ], adminMethods.createEjudgeProblemRequest);

router.post('/solutions/:solutionId/verdict', [ userRetriever, rightsAllocator('admin') ], adminMethods.setVerdictRequest);
router.post('/solutions/:solutionId/refresh', [ userRetriever, rightsAllocator('admin') ], adminMethods.refreshSolutionRequest);
router.post('/solutions/:solutionId/duplicate', [ userRetriever, rightsAllocator('admin') ], adminMethods.duplicateSolutionRequest);

router.get('/users', [ userRetriever, rightsAllocator('admin') ], adminMethods.searchUsersRequest);
router.post('/users', [ userRetriever, rightsAllocator('admin') ], adminMethods.createUserRequest);
router.get('/users/:userId', [ userRetriever, rightsAllocator('admin') ], adminMethods.getUserRequest);
router.post('/users/:userId', [ userRetriever, rightsAllocator('admin') ], adminMethods.updateUserRequest);

router.delete('/users/:userId', [ userRetriever, rightsAllocator('admin') ], adminMethods.deleteUserRequest);

router.post('/contests', [ userRetriever, rightsAllocator('admin') ], adminMethods.createContestRequest);
router.post('/contests/:contestId', [ userRetriever, rightsAllocator('admin') ], adminMethods.updateContestRequest);
router.get('/contests/:contestId', [ userRetriever, rightsAllocator('admin') ], adminMethods.getContestRequest);
router.delete('/contests/:contestId', [ userRetriever, rightsAllocator('admin') ], adminMethods.deleteContestRequest);
router.post('/contests/:contestId/repair', [ userRetriever, rightsAllocator('admin') ], adminMethods.repairContestRequest);

export default router;