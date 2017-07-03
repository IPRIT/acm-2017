import * as models from '../../../../../models';
import { ensureNumber } from "../../../../../utils";
import Promise from 'bluebird';
import request from 'request-promise';
import cheerio from 'cheerio';
import { retrieveTimusProblem } from "./timus";

const SYSTEM_TYPE = 'timus';
const ACM_PROTOCOL = 'http';
const ACM_HOST = 'acm.timus.ru';
const ACM_PROBLEMSET_PATH = '/problemset.aspx';

export async function rescanTimusProblem(params) {
  let {
    problemId, problem
  } = params;

  if (!problem) {
    problem = await models.Problem.findByPrimary(problemId);
    if (!problem) {
      throw HttpError('Problem not found');
    }
  }
  let taskMeta = await getTaskMeta(problem);
  let { htmlStatement, textStatement } = await retrieveTimusProblem(taskMeta);

  let versionNumber = await models.ProblemVersionControl.getCurrentVersion(problem.id);

  await problem.update({
    htmlStatement,
    textStatement,
    title: taskMeta.name
  });
  return problem.createProblemVersionControl({
    htmlStatement,
    textStatement,
    title: taskMeta.name,
    versionNumber: versionNumber + 1,
    attachments: ''
  });
}

export async function getTaskMeta(problem) {
  let endpoint = getEndpoint(ACM_PROBLEMSET_PATH);
  let taskMeta = {};

  return Promise.resolve().then(async () => {
    let body = await request({
      method: 'GET',
      uri: endpoint,
      qs: {
        space: 1,
        page: 'all'
      },
      simple: false,
      followAllRedirects: true,
      headers: {
        'Accept-Language': 'ru,en'
      }
    });

    const $ = cheerio.load(body);

    $('table.problemset').find('tr.content').slice(1).each((index, row) => {
      let $row = $(row);
      let internalSystemId = ensureNumber($row.find('td').eq(1).text()),
        name = $row.find('td').eq(2).text();
      if (problem.foreignProblemIdentifier == internalSystemId) {
        taskMeta = {
          internalSystemId,
          name
        }
      }
    });
    return taskMeta;
  });
}

function getEndpoint(pathTo = '') {
  return `${ACM_PROTOCOL}://${ACM_HOST}${pathTo}`;
}