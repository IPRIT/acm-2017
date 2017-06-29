import express from 'express';
import { rightsAllocator, userRetriever } from '../../utils';
import * as problems from './methods';

const router = express.Router();

router.get('/:problemId', [ userRetriever, rightsAllocator('user') ], problems.getProblemRequest);
router.get('/:problemId/version/:versionNumber', [ userRetriever, rightsAllocator('user') ], problems.getProblemRequest);

export default router;