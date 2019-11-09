import * as socket from '../../../../../socket';
import * as models from '../../../../../models';
import { ensureNumber, getEndpoint, passwordHash } from "../../../../../utils";
import Promise from 'bluebird';
import request from 'request-promise';
import cheerio from 'cheerio';
import fetch from 'fetch';

export const SYSTEM_TYPE = 'acmp';
export const ACM_PROTOCOL = 'https';
export const ACM_HOST = 'acmp.ru';
export const ACM_PROBLEMSET_PATH = '/index.asp'; // ?main=tasks&page=0
export const ACM_PROBLEM_PATH = '/index.asp'; // ?main=task&id_task=1

const consoleMessagePattern = '[{systemType}] {message}';

export async function scanAcmp(params) {
  let tasksMeta = await getAllTasksMeta();
  socket.emitScannerConsoleLog(buildMessage('Список всех задач получен.'));
  socket.emitScannerConsoleLog(buildMessage('Получение полных условий для задач...'));
  await retrieveProblems(tasksMeta, params);

  return params;
}

/**
 * @return {Promise<Array>}
 */
async function getAllTasksMeta() {
  const pagesNumber = await getPagesNumber();

  let rows = [];
  let logHash = passwordHash(Math.random().toString());
  let message = `Получение списка задач... Найдено: {0}.`;
  socket.emitScannerConsoleLog(
    buildMessage(message.replace('{0}', rows.length)),
    logHash
  );

  return Promise.resolve(
    Array( pagesNumber ).fill(0).map((v, i) => i)
  ).map(pageNumber => {
    let endpoint = getEndpoint(ACM_HOST, ACM_PROBLEMSET_PATH, {}, {
      main: 'tasks',
      page: pageNumber
    });

    return fetchPage( endpoint ).then(body => {
      const $ = cheerio.load( body );
      const content = $('.white');
      content.each(function () {
        const _ = $(this);
        const tds = _.find( 'td' );
        if (!tds.length) {
          return;
        }
        try {
          let taskNumber = ensureNumber( tds.eq(0).text().trim() );
          let taskName = tds.eq(1).text().trim();
          rows.push({
            internalSystemId: taskNumber,
            name: taskName
          });
        } catch (err) {
          console.log(err);
        }
      });

      socket.emitScannerConsoleLog(
        buildMessage(message.replace('{0}', rows.length)),
        logHash
      );
    });
  }, { concurrency: 3 }).then(_ => rows);
}

/**
 * @param {string} endpoint
 * @return {Promise<string>}
 */
export async function fetchPage (endpoint) {
  return new Promise((resolve, reject) => {
    fetch.fetchUrl(endpoint, (error, meta, body) => {
      if (error) {
        return reject( error );
      }
      resolve( body.toString() );
    });
  });
}

/**
 * @return {Promise<number>}
 */
async function getPagesNumber () {
  let endpoint = getEndpoint(ACM_HOST, ACM_PROBLEMSET_PATH);

  let body = await request({
    method: 'GET',
    uri: endpoint,
    qs: {
      main: 'tasks',
      page: 0
    },
    simple: false,
    followAllRedirects: true,
    headers: {
      'Accept-Language': 'ru,en'
    }
  });

  const $ = cheerio.load(body);

  const allPagesElements = $('a.small');
  if (!allPagesElements || !allPagesElements.length) {
    return 0;
  }
  return parseInt(
    allPagesElements.eq(allPagesElements.length - 1).text().trim()
  );
}

/**
 * @param {Array} tasksMeta
 * @param {Object} params
 * @return {Promise<*>}
 */
async function retrieveProblems(tasksMeta, params) {
  let progressNumber = 0;
  let changed = [];
  let inserted = [];
  let progressEmitter = buildProgressMessage();
  let {
    insert, update
  } = params;

  return Promise.resolve(tasksMeta).map(async taskMeta => {
    let { htmlStatement, textStatement } = await retrieveAcmpProblem(taskMeta);

    let problem = await models.Problem.findOne({
      where: {
        foreignProblemIdentifier: taskMeta.internalSystemId,
        systemType: SYSTEM_TYPE
      }
    });
    if (!problem) {
      if (insert) {
        problem = await models.Problem.create({
          systemType: SYSTEM_TYPE,
          foreignProblemIdentifier: taskMeta.internalSystemId,
          title: taskMeta.name,
          htmlStatement,
          textStatement
        });
        let versionNumber = await models.ProblemVersionControl.getCurrentVersion(problem.id);
        await problem.createProblemVersionControl({
          htmlStatement,
          textStatement,
          title: taskMeta.name,
          versionNumber: versionNumber + 1,
          attachments: ''
        });
        inserted.push(problem);
      }
    } else if (problem.htmlStatement !== htmlStatement) {
      if (update) {
        await problem.update({
          htmlStatement,
          textStatement,
          title: taskMeta.name
        });
        let versionNumber = await models.ProblemVersionControl.getCurrentVersion(problem.id);
        await problem.createProblemVersionControl({
          htmlStatement,
          textStatement,
          title: taskMeta.name,
          versionNumber: versionNumber + 1,
          attachments: ''
        });
        changed.push(problem);
      }
    }
    ++progressNumber;
    progressEmitter(progressNumber / tasksMeta.length * 100);
  }, { concurrency: 10 }).then(() => {
    printResults(inserted, changed);
    socket.emitScannerConsoleLog(`finished`);
  });
}

/**
 * @param {Object} taskMeta
 * @return {Promise<{htmlStatement: string, textStatement: *}>}
 */
export async function retrieveAcmpProblem(taskMeta) {
  let endpoint = getEndpoint(ACM_HOST, ACM_PROBLEM_PATH, {}, {
    main: 'task',
    id_task: taskMeta.internalSystemId
  });

  let body = await fetchPage( endpoint );
  body = body.replace(/((\<|\>)(\=|\d+))/gi, ' $2 $3 ');
  const $ = cheerio.load(body);
  const content = $('table td[background="/images/notepad2.gif"]');

  content.find('img').each(function () {
    var imgThis = $(this),
      src = imgThis.attr('src');
    if (src && src.indexOf('http://acmp.ru') === -1) {
      imgThis.attr('src', 'http://acmp.ru' + src);
    }
  });
  content.find('h4 a').remove();
  content.find('h4 i').remove();
  content.find('ins').remove();
  content.find('script').remove();

  const htmlStatement = content.html().replace(/\s(?=\s)/gi, '').replace(/(\=\"\")/gi, '');
  const textStatement = content.text().trim();

  return { htmlStatement, textStatement }
}

/**
 * @param {string} message
 * @return {string}
 */
function buildMessage(message = '') {
  return consoleMessagePattern.replace('{systemType}', SYSTEM_TYPE)
    .replace('{message}', message);
}

/**
 * @return {Function}
 */
function buildProgressMessage() {
  let progressHash = passwordHash(Math.random().toString());
  return (progressNumber = 0) => {
    socket.emitScannerConsoleLog(
      buildMessage(`Получено ${progressNumber.toFixed(2)}% [${'&blk34;'.repeat(progressNumber / 5)}${'&nbsp;'.repeat((100 - progressNumber) / 5)}] 100%`),
      progressHash
    );
  }
}

function printResults(inserted, changed) {
  let message = `
    Добавлено задач: \`${inserted.length}\`. Обновлено задач: \`${changed.length}\`.
    
    | Название задачи | Действие |
    | ------------- | :------------- |
  `;
  for (let insertedProblem of inserted) {
    message += `| <a target="_blank" href='/problems/${insertedProblem.id}'>${insertedProblem.title}</a> (<a target="_blank" href='http://acmp.ru/index.asp?main=task&id_task=${insertedProblem.foreignProblemIdentifier}'>${SYSTEM_TYPE}</a>) | добавлена |
    `;
  }
  for (let updatedProblem of changed) {
    message += `| <a target="_blank" href='/problems/${updatedProblem.id}'>${updatedProblem.title}</a> (<a target="_blank" href='http://acmp.ru/index.asp?main=task&id_task=${insertedProblem.foreignProblemIdentifier}'>${SYSTEM_TYPE}</a>) | обновлена |
    `;
  }
  if (!inserted.length && !changed.length) {
    message += `| - | - |
    `;
  }
  socket.emitScannerConsoleLog( message );
}