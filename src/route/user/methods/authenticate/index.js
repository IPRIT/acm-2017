import express from 'express';
import { signIn, logout, signUpInGroup } from './form';
import { userRetriever } from "../../../../utils";

const router = express.Router();

router.post('/sign-in', signIn);
router.post('/sign-up-in-group', [ userRetriever ], signUpInGroup);
router.post('/logout', logout);

export default router;