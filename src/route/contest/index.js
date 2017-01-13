import express from 'express';
import { rightsAllocator, userRetriever } from '../../utils';
import * as contest from './methods';

const router = express.Router();

router.get('/all', [ userRetriever, rightsAllocator('user') ], contest.getContests);

export default router;