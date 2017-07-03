import request from 'request-promise';
import cheerio from 'cheerio';
import { config } from "../../utils";
import { getClearedSolutionId } from "./getVerdict";

const ACM_SOLUTIONS_ENDPOINT = '/cgi-bin/new-judge';

export async function getCompilationError(systemAccount, contextRow) {
  let { jar, sid } = systemAccount;
  let { solutionId } = contextRow;
  let clearedSolutionId = getClearedSolutionId(solutionId);

  let endpoint = getEndpoint(ACM_SOLUTIONS_ENDPOINT);
  let response = await request({
    method: 'GET',
    uri: endpoint,
    qs: {
      SID: sid,
      run_id: clearedSolutionId,
      action: 37
    },
    simple: false,
    resolveWithFullResponse: true,
    followAllRedirects: true,
    encoding: 'utf8',
    jar
  });
  if (!response.body || ![ 200 ].includes(response.statusCode)) {
    return 'Service Unavailable';
  }

  let $ = cheerio.load(response.body);
  return $('div#container pre').text();
}

function getEndpoint(pathTo = '') {
  let { host, protocol } = config.ejudge;
  return `${protocol}://${host}${pathTo}`;
}