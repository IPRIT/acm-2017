import express from 'express';
import { rightsAllocator, userRetriever } from '../../utils';
import * as adminMethods from '../admin/methods';
import * as formData from 'express-form-data';

const router = express.Router();

router.use(formData.parse());
router.use(formData.stream());
router.use(formData.union());

router.post('/yandex-polygon-import', [ userRetriever, rightsAllocator('admin') ], adminMethods.yandexPolygonImportRequest);

export default router;