import express from 'express';
import { rightsAllocator, userRetriever } from '../../utils';
import * as problem from './methods';

const router = express.Router();


//router.get('/all', [ userRetriever, rightsAllocator('user') ], problem.getContestsRequest);

export default router;