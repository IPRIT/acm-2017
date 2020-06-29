'use strict';

import express from 'express';
import { isJsonRequest } from './../../utils';

const isProduction = process.env.NODE_ENV === 'production';

const router = express.Router();

router.get('/', [ isJsonRequest(false) ], function(req, res) {
  res.render('index/index', {
    manifest: isProduction ? '/manifest.appcache' : '',
  });
});

export default router;