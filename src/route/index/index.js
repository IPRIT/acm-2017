'use strict';

import express from 'express';
import { isJsonRequest } from './../../utils';

var router = express.Router();

router.get('/', [ isJsonRequest(false) ], function(req, res) {
  res.render('index/index');
});

export default router;