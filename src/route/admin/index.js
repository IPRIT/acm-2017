import express from 'express';
import { rightsAllocator, userRetriever } from '../../utils';
import * as adminMethods from './methods';

const router = express.Router();


router.post('/ratingTable', [ userRetriever, rightsAllocator('admin') ], adminMethods.getRatingTableRequest);
router.get('/groups', [ userRetriever, rightsAllocator('admin') ], adminMethods.searchGroupsRequest);
router.get('/problems/:problemId', [ userRetriever, rightsAllocator('admin') ], adminMethods.getProblemRequest);
router.post('/problems/:problemId', [ userRetriever, rightsAllocator('admin') ], adminMethods.updateProblemRequest);
router.post('/problems/new/ejudge', [ userRetriever, rightsAllocator('admin') ], adminMethods.createEjudgeProblemRequest);

export default router;