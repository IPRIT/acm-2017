import request from 'request-promise';
import Promise from 'bluebird';

const ACM_PROTOCOL = 'http';
const ACM_HOST = 'codeforces.com';
const ACM_JUDGE_PROTOCOL_PATH = '/data/judgeProtocol';

export async function getCompilationError(systemAccount, receivedRow) {
  return Promise.resolve().then(async () => {
    let response, attemptsNumber = 0, maxAttemptsNumber = 3;
    while (attemptsNumber < maxAttemptsNumber) {
      attemptsNumber++;
      response = await requestCompilationError(systemAccount, receivedRow);
      if (response.statusCode === 200 && response.body) {
        return response.body;
      }
    }
    return null;
  });
}

async function requestCompilationError(systemAccount, receivedRow) {
  let endpoint = getEndpoint(ACM_JUDGE_PROTOCOL_PATH);
  let { jar } = systemAccount;
  return await request({
    method: 'POST',
    headers: {
      'Accept-Language': 'ru,en;q=0.8'
    },
    uri: endpoint,
    form: buildForm(systemAccount, receivedRow),
    simple: false,
    followAllRedirects: true,
    json: true,
    resolveWithFullResponse: true,
    jar
  });
}

function buildForm(systemAccount, receivedRow) {
  return {
    submissionId: receivedRow.solutionId,
    csrf_token: systemAccount.csrfToken
  };
}

function getEndpoint(pathTo = '') {
  return `${ACM_PROTOCOL}://${ACM_HOST}${pathTo}`;
}