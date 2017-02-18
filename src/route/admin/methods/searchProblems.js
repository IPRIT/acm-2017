import * as models from "../../../models";
import Promise from 'bluebird';
import userGroups from './../../../models/User/userGroups';
import { valueBetween } from "../../../utils/utils";
import * as deap from "deap/lib/deap";

export function searchProblemsRequest(req, res, next) {
  return Promise.resolve().then(() => {
    return searchProblems(req.query);
  }).then(result => res.json(result)).catch(next);
}

export async function searchProblems(params) {
  let {
    q, offset = 0, count = 30,
    systemType
  } = params;
  
  let limit = valueBetween(count, 1, 200);
  offset = valueBetween(offset, 0);
  if (!systemType || systemType === 'all') {
    systemType = null;
  }
  
  let where = {
    $or: {
      title: {
        $like: `%${q}%`
      },
      foreignProblemIdentifier: {
        $like: `%${q}%`
      },
      textStatement: {
        $like: `%${q}%`
      }
    }
  };
  if (systemType) {
    deap.extend(where, { systemType });
  }
  return models.Problem.findAll({
    where,
    offset,
    limit,
    attributes: { exclude: [ 'textStatement' ] }
  }).then(async problems => {
    return {
      problems,
      q,
      problemsNumber: await models.Problem.count({ where })
    }
  });
}