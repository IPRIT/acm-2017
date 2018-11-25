import express from 'express';
import { rightsAllocator, userRetriever } from '../../utils';
import * as methods from './methods';
import multer from "multer";

const upload = multer({ dest: 'app/uploads/images' });

const router = express.Router();

router.post('/image', [
  userRetriever,
  rightsAllocator( 'admin' ),
  upload.single( 'file' )
], methods.uploadImageRequest);

export default router;

