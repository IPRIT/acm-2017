import * as models from '../../../../../models';
import { ensureNumber } from "../../../../../utils";
import Promise from 'bluebird';
import request from 'request-promise';
import cheerio from 'cheerio';
import { retrieveAcmpProblem } from "./acmp";

const SYSTEM_TYPE = 'timus';
const ACM_PROTOCOL = 'http';
const ACM_HOST = 'acm.timus.ru';
const ACM_PROBLEMSET_PATH = '/problemset.aspx';

export async function rescanAcmpProblem(params) {
  let {
    problemId, problem
  } = params;

  if (!problem) {
    problem = await models.Problem.findByPrimary(problemId);
    if (!problem) {
      throw HttpError('Problem not found');
    }
  }

  // todo
}

export async function getTaskMeta({ problemId }) {
  const problemContent = await retrieveAcmpProblem(problem);
}