import express from 'express';
import { rightsAllocator, userRetriever } from '../../utils';
import * as user from './methods';

const router = express.Router();

router.use('/authenticate', user.authenticator);

router.get('/me', [ userRetriever, rightsAllocator('user') ], user.me);

export default router;