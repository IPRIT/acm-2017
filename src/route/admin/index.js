import express from 'express';
import { rightsAllocator, userRetriever } from '../../utils';
import * as adminMethods from './methods';

const router = express.Router();


router.post('/ratingTable', [ userRetriever, rightsAllocator('admin') ], adminMethods.getRatingTableRequest);

export default router;