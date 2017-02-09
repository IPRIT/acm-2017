import express from 'express';
import { rightsAllocator, userRetriever } from '../../utils';
import * as adminMethods from './methods';

const router = express.Router();


router.post('/ratingTable', [ userRetriever, rightsAllocator('admin') ], adminMethods.getRatingTableRequest);

router.get('/groups', [ userRetriever, rightsAllocator('admin') ], adminMethods.searchGroupsRequest);
router.post('/groups', [ userRetriever, rightsAllocator('admin') ], adminMethods.createGroupRequest);
router.get('/groups/:groupId', [ userRetriever, rightsAllocator('admin') ], adminMethods.getGroupRequest);
router.post('/groups/:groupId', [ userRetriever, rightsAllocator('admin') ], adminMethods.updateGroupRequest);
router.delete('/groups/:groupId', [ userRetriever, rightsAllocator('admin') ], adminMethods.deleteGroupRequest);

router.get('/problems', [ userRetriever, rightsAllocator('admin') ], adminMethods.searchProblemsRequest);
router.get('/problems/:problemId', [ userRetriever, rightsAllocator('admin') ], adminMethods.getProblemRequest);
router.post('/problems/:problemId', [ userRetriever, rightsAllocator('admin') ], adminMethods.updateProblemRequest);
router.delete('/problems/:problemId', [ userRetriever, rightsAllocator('admin') ], adminMethods.deleteProblemRequest);
router.post('/problems/new/ejudge', [ userRetriever, rightsAllocator('admin') ], adminMethods.createEjudgeProblemRequest);

router.post('/solutions/:solutionId/verdict', [ userRetriever, rightsAllocator('admin') ], adminMethods.setVerdictRequest);
router.post('/solutions/:solutionId/refresh', [ userRetriever, rightsAllocator('admin') ], adminMethods.refreshSolutionRequest);
router.post('/solutions/:solutionId/duplicate', [ userRetriever, rightsAllocator('admin') ], adminMethods.duplicateSolutionRequest);
router.delete('/solutions/:solutionId', [ userRetriever, rightsAllocator('admin') ], adminMethods.deleteSolutionRequest);

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
router.post('/contests/:contestId/solutions/refresh', [ userRetriever, rightsAllocator('admin') ], adminMethods.refreshSolutionsRequest);
router.post('/contests/:contestId/solutions/refresh/:symbolIndex', [ userRetriever, rightsAllocator('admin') ], adminMethods.refreshSolutionsForProblemRequest);
router.post('/contests/:contestId/solutions/refresh/:symbolIndex/:userId', [ userRetriever, rightsAllocator('admin') ], adminMethods.refreshSolutionsForProblemAndUserRequest);

export default router;