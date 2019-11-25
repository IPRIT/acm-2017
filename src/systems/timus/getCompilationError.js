import request from 'request-promise';
import Promise from 'bluebird';

const ACM_PROTOCOL = 'https';
const ACM_HOST = 'acm.timus.ru';
const ACM_ENDPOINT = '/auth.aspx';

export async function getCompilationError(systemAccount, receivedRow) {
  let endpoint = getEndpoint(ACM_ENDPOINT);
  return Promise.resolve().then(async () => {
    let response = await request({
      method: 'POST',
      headers: {
        'Accept-Language': 'ru,en;q=0.8'
      },
      uri: endpoint,
      form: buildForm(systemAccount, receivedRow),
      simple: false,
      followAllRedirects: true,
      resolveWithFullResponse: true,
      jar: true
    });
    if (response.headers && (response.headers[ 'content-type' ] || '').includes('text/plain')) {
      return response.body;
    }
    return null;
  });
}

function buildForm(systemAccount, receivedRow) {
  return {
    Action: 'login',
    Source: `/ce.aspx?id=${receivedRow.solutionId}`,
    JudgeID: systemAccount.instance.systemLogin
  };
}

function getEndpoint(pathTo = '') {
  return `${ACM_PROTOCOL}://${ACM_HOST}${pathTo}`;
}
