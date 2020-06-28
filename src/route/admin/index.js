import express from 'express';
import { rightsAllocator, userRetriever, isJsonRequest } from '../../utils';
import * as adminMethods from './methods';

const router = express.Router();


router.post('/ratingTable', [ userRetriever, rightsAllocator('moderator', 'user') ], adminMethods.getRatingTableRequest);

router.get('/groups', [ userRetriever, rightsAllocator('moderator') ], adminMethods.searchGroupsRequest);
router.post('/groups', [ userRetriever, rightsAllocator('moderator') ], adminMethods.createGroupRequest);
router.get('/groups/:groupId', [ userRetriever, rightsAllocator('moderator') ], adminMethods.getGroupRequest);
router.post('/groups/:groupId', [ userRetriever, rightsAllocator('moderator') ], adminMethods.updateGroupRequest);
router.post('/groups/:groupId/links', [ userRetriever, rightsAllocator('moderator') ], adminMethods.createGroupRegisterLinkRequest);
router.get('/groups/:groupId/links', [ userRetriever, rightsAllocator('moderator') ], adminMethods.getGroupRegisterLinksRequest);
router.get('/groups/links/:registerKey', [ userRetriever ], adminMethods.getGroupByRegisterKeyRequest);
router.delete('/groups/:groupId/links/:linkUuid', [ userRetriever, rightsAllocator('moderator') ], adminMethods.revokeGroupRegisterLinkRequest);
router.delete('/groups/:groupId', [ userRetriever, rightsAllocator('moderator') ], adminMethods.deleteGroupRequest);

router.get('/verdicts', [ userRetriever, rightsAllocator('moderator', 'user') ], adminMethods.getVerdictsRequest);

router.get('/problems', [ userRetriever, rightsAllocator('moderator') ], adminMethods.searchProblemsRequest);
router.get('/problems/:problemId', [ userRetriever, rightsAllocator('moderator') ], adminMethods.getProblemRequest);
router.post('/problems/scan', [ userRetriever, rightsAllocator('admin') ], adminMethods.scanRequest);
router.post('/problems/:problemId', [ userRetriever, rightsAllocator('admin') ], adminMethods.updateProblemRequest);
router.post('/problems/:problemId/rescan', [ userRetriever, rightsAllocator('admin') ], adminMethods.rescanProblemRequest);
router.post('/problems/:problemId/rollback/:versionNumber', [ userRetriever, rightsAllocator('admin') ], adminMethods.rollbackProblemRequest);
router.delete('/problems/:problemId', [ userRetriever, rightsAllocator('admin') ], adminMethods.deleteProblemRequest);
router.post('/problems/new/ejudge', [ userRetriever, rightsAllocator('admin') ], adminMethods.createEjudgeProblemRequest);
router.post('/problems/new/acmp', [ userRetriever, rightsAllocator('admin') ], adminMethods.importAcmpProblemRequest);

router.post('/solutions/:solutionId/verdict', [ userRetriever, rightsAllocator('moderator') ], adminMethods.setVerdictRequest);
router.post('/solutions/:solutionId/refresh', [ userRetriever, rightsAllocator('moderator') ], adminMethods.refreshSolutionRequest);
router.post('/solutions/:solutionId/duplicate', [ userRetriever, rightsAllocator('moderator') ], adminMethods.duplicateSolutionRequest);
router.delete('/solutions/:solutionId', [ userRetriever, rightsAllocator('moderator') ], adminMethods.deleteSolutionRequest);

router.get('/users', [ userRetriever, rightsAllocator('moderator', 'user') ], adminMethods.searchUsersRequest);
router.post('/users', [ userRetriever, rightsAllocator('moderator') ], adminMethods.createUserRequest);
router.post('/users-groups', [ userRetriever, rightsAllocator('moderator') ], adminMethods.createUsersIntoGroupsRequest);
router.get('/users/:userId', [ userRetriever, rightsAllocator('moderator') ], adminMethods.getUserRequest);
router.post('/users/:userId', [ userRetriever, rightsAllocator('admin') ], adminMethods.updateUserRequest);
router.delete('/users/:userId', [ userRetriever, rightsAllocator('admin') ], adminMethods.deleteUserRequest);

router.post('/contests', [ userRetriever, rightsAllocator('moderator') ], adminMethods.createContestRequest);
router.post('/contests/:contestId', [ userRetriever, rightsAllocator('moderator') ], adminMethods.updateContestRequest);
router.post('/contests/:contestId/problems', [ userRetriever, rightsAllocator('moderator') ], adminMethods.setProblemsForContestRequest);
router.get('/contests/:contestId', [ userRetriever, rightsAllocator('moderator') ], adminMethods.getContestRequest);
router.delete('/contests/:contestId', [ userRetriever, rightsAllocator('moderator') ], adminMethods.deleteContestRequest);
router.post('/contests/:contestId/repair', [ userRetriever, rightsAllocator('admin') ], adminMethods.repairContestRequest);
router.delete('/contests/:contestId/users/:userId', [ userRetriever, rightsAllocator('moderator') ], adminMethods.deleteUserFromContestRequest);
router.post('/contests/:contestId/solutions/refresh', [ userRetriever, rightsAllocator('moderator') ], adminMethods.refreshSolutionsRequest);
router.post('/contests/:contestId/solutions/refresh/:symbolIndex', [ userRetriever, rightsAllocator('moderator') ], adminMethods.refreshSolutionsForProblemRequest);
router.post('/contests/:contestId/solutions/refresh/:symbolIndex/:userId', [ userRetriever, rightsAllocator('moderator') ], adminMethods.refreshSolutionsForProblemAndUserRequest);

router.post('/computeRatings', [ userRetriever, rightsAllocator('admin') ], adminMethods.computeRatingsRequest);

router.get('/status', [ userRetriever, rightsAllocator('admin') ], adminMethods.getSystemStatusRequest);
router.post('/restart', [ userRetriever, rightsAllocator('admin') ], adminMethods.restartRequest);

router.post('/yandex-import-by-id', [ userRetriever, rightsAllocator('admin') ], adminMethods.yandexImportByIdRequest);
router.post('/yandex-official-import-by-id', [ userRetriever, rightsAllocator('admin') ], adminMethods.yandexOfficialImportByIdRequest);

export default router;