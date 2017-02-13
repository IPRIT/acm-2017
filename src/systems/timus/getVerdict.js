import cheerio from 'cheerio';
import querystring from 'querystring';
import url from 'url';
import request from 'request-promise';
import { extractParam } from "../../utils/utils";
import * as models from '../../models';
import Promise from 'bluebird';

const ACM_PROTOCOL = 'http';
const ACM_HOST = 'acm.timus.ru';
const ACM_SOLUTIONS_POST_ENDPOINT = '/submit.aspx?space=1';

export async function getVerdict(solution, systemAccount) {
  let endpoint = getEndpoint(ACM_SOLUTIONS_POST_ENDPOINT);
  return Promise.resolve().delay(200).then(async () => {
    return {
      id: null,
      isTerminal: false,
      name: 'Running',
      testNumber: 10,
      executionTime: 0.2,
      memory: 10200
    }
  });
}

function getEndpoint(pathTo = '') {
  return `${ACM_PROTOCOL}://${ACM_HOST}${pathTo}`;
}