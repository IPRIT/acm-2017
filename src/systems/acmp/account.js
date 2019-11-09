import cheerio from 'cheerio';
import querystring from 'querystring';
import request from 'request-promise';
import Promise from 'bluebird';

const ACM_PROTOCOL = 'https';
const ACM_HOST = 'acmp.ru';
const ACM_AUTH_ENDPOINT = '/index.asp';

export async function login(systemAccount) {
  let endpoint = getEndpoint(ACM_AUTH_ENDPOINT, {
    main: 'enter',
    r: 5 * 1e8 + Math.floor(Math.random() * 5 * 1e8)
  });
  return Promise.resolve().then(async () => {
    let jar = request.jar();
    let response = await request({
      method: 'POST',
      uri: endpoint,
      form: buildBody(systemAccount),
      simple: false,
      resolveWithFullResponse: true,
      followAllRedirects: true,
      jar
    });
    if (!response.body || ![ 200, 302 ].includes( response.statusCode )) {
      throw new Error('Service unavailable');
    }
  
    const loginFailedException = new Error('Login failed');
    
    let foreignAccountId;
    try {
      foreignAccountId = await getForeignAccountId(jar);
    } catch (err) {
      throw loginFailedException;
    }
    if (!foreignAccountId) {
      throw loginFailedException;
    }
    return Object.assign(systemAccount, {
      lastLoginAtMs: Date.now(),
      foreignAccountId, jar
    });
  });
}

function getEndpoint(pathTo = '', searchParams = {}) {
  const searchParamsNotEmpty = Object.keys(searchParams).length;
  return `${ACM_PROTOCOL}://${ACM_HOST}${pathTo}${searchParamsNotEmpty ? 
    '?' + querystring.stringify(searchParams) : ''}`;
}

function buildBody(systemAccount) {
  return {
    lgn: systemAccount.instance.systemLogin,
    password: systemAccount.instance.systemPassword
  };
}

export async function getForeignAccountId(jar) {
  const serviceUnavailableException = new Error('Service Unavailable');
  // request the main page and "snatch" the account id
  let mainPageUrl = `${ACM_PROTOCOL}://${ACM_HOST}`;
  let response = await request({
    method: 'GET',
    uri: mainPageUrl,
    simple: false,
    resolveWithFullResponse: true,
    followAllRedirects: true,
    jar
  });
  if (!response.body || ![ 200, 302 ].includes( response.statusCode )) {
    throw serviceUnavailableException;
  }
  
  let foreignAccountId;
  let { body } = response;
  let $ = cheerio.load(body);
  
  let menuTitle = $('.menu_title');
  if (menuTitle.length) {
    let panel = menuTitle.eq(0).parent().parent();
    if (panel.length) {
      let links = panel.find('a'), hrefNeedle;
      for (var i = 0; i < links.length; ++i) {
        hrefNeedle = links.eq(i).attr('href');
        let properLinkRegExp = /main=user&id=(\d+)/i;
        if (properLinkRegExp.test(hrefNeedle)) {
          foreignAccountId = hrefNeedle.match(properLinkRegExp)[1];
          break;
        }
      }
    }
  }
  return foreignAccountId;
}