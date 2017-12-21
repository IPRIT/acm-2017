import * as models from "../../../models";
import Promise from 'bluebird';
import userGroups from './../../../models/User/userGroups';

export function createEjudgeProblemRequest(req, res, next) {
  return Promise.resolve().then(() => {
    return createEjudgeProblem(
      Object.assign(req.params, req.body)
    );
  }).then(result => res.json(result)).catch(next);
}

export async function createEjudgeProblem(params) {
  let {
    title = `Noname problem ${Math.random()}`,
    ejudgeContestId, ejudgeProblemIndex
  } = params;
  
  let foreignProblemIdentifier = `${ejudgeContestId}:${ejudgeProblemIndex}`;
  let systemType = 'ejudge';
  let attachments = {
    config: {
      replaced: false,
      markup: 'markdown',
      files_location: 'top'
    },
    files: [],
    content: {
      text: ''
    }
  };
  return models.Problem.create({
    systemType,
    foreignProblemIdentifier,
    title,
    htmlStatement: `statement`,
    textStatement: 'statement',
    attachments: JSON.stringify(attachments)
  });
}