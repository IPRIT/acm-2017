import * as models from "../../../models";
import Promise from 'bluebird';
import * as contests from './index';

export function getLanguagesRequest(req, res, next) {
  return Promise.resolve().then(() => {
    return getLanguages(req.params);
  }).then(result => res.json(result)).catch(next);
}

export async function getLanguages(params) {
  let problem = await contests.getProblemBySymbolIndex(params);
  let { systemType } = problem;
  return models.Language.findAll({
    where: { systemType }
  });
}