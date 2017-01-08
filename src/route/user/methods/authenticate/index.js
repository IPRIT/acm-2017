import express from 'express';
import { signIn } from './form';

const router = express.Router();

router.post('/sign-in', signIn);

export default router;