import * as models from "../../../models";
import Promise from 'bluebird';
import sequelize from 'sequelize';
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
      }/*,
      textStatement: {
        $like: `%${q}%`
      }*/
    }
  };
  if (systemType) {
    deap.extend(where, { systemType });
  }
  return models.Problem.findAll({
    where,
    offset,
    limit,
    attributes: {
      exclude: [ 'textStatement' ]
    },
    include: [{
      model: models.Solution,
      group: [ 'problemId' ],
      attributes: [ 'verdictId' ]
    }]
  }).map(problem => {
    problem = problem.get({ plain: true });
    problem.acceptedNumber = problem.Solutions.reduce((sum, { verdictId }) => sum + (verdictId === 1), 0);
    problem.solutionsNumber = problem.Solutions.length;
    problem.Solutions = null;
    delete problem.Solutions;
    return problem;
  }).then(async problems => {
    return {
      problems: problems.sort((a, b) => a.solutionsNumber - b.solutionsNumber),
      q,
      problemsNumber: await models.Problem.count({ where })
    }
  });
}