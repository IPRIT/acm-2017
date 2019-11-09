import cheerio from 'cheerio';
import request from 'request-promise';
import Promise from 'bluebird';

const ACM_PROTOCOL = 'https';
const ACM_HOST = 'acmp.ru';

export async function getCompilationError(systemAccount, receivedRow) {
  return Promise.resolve().then(async () => {
    let endpoint = getEndpoint('/index.asp');
    let { jar } = systemAccount;
    let body = await request({
      method: 'GET',
      uri: endpoint,
      qs: {
        main: 'source',
        id: receivedRow.solutionId
      },
      simple: false,
      followAllRedirects: true,
      jar
    });
    
    var $ = cheerio.load(body);
    
    let compilationErrorNode = $('font[color="red"][face="courier"]');
    if (compilationErrorNode.length) {
      return compilationErrorNode.text();
    }
    return null;
  });
}

function getEndpoint(pathTo = '') {
  return `${ACM_PROTOCOL}://${ACM_HOST}${pathTo}`;
}