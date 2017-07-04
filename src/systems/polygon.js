import * as yandex from './yandex';
import * as models from '../models';
import express from 'express';
import formData from 'express-form-data';
import Promise from 'bluebird';
import * as socket from '../socket';

const router = express.Router();

router.use(formData.parse());
router.use(formData.stream());
router.use(formData.union());

router.get('/', test);
router.post('/', test);

async function test(req, res, next) {
  return Promise.resolve().then(() => {
    return _test(req, res);
  }).then(result => res.json(result)).catch(next);
}

async function _test(req, res) {
  let solution = await models.Solution.findByPrimary(14323, {
    include: [{
      model: models.Problem,
      required: true
    }, models.Language ]
  });

  return yandex.handle(solution);
}

export default router;