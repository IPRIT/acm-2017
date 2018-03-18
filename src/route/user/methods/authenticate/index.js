import express from 'express';
import { signIn, logout, signUpInGroup } from './form';

const router = express.Router();

router.post('/sign-in', signIn);
router.post('/sign-up-in-group', signUpInGroup);
router.post('/logout', logout);

export default router;