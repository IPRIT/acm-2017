import express from 'express';
import { signIn, logout } from './form';

const router = express.Router();

router.post('/sign-in', signIn);
router.post('/logout', logout);

export default router;