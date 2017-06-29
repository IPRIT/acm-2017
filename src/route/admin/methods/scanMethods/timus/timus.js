import * as socket from '../../../../../socket';
import * as models from '../../../../../models';
import { extractParam, ensureNumber, passwordHash } from "../../../../../utils";
import Promise from 'bluebird';
import request from 'request-promise';
import cheerio from 'cheerio';

const SYSTEM_TYPE = 'timus';
const ACM_PROTOCOL = 'http';
const ACM_HOST = 'acm.timus.ru';
const ACM_PROBLEMSET_PATH = '/problemset.aspx';
const ACM_PROBLEM_PATH = '/problem.aspx';

const consoleMessagePattern = '[{systemType}] {message}';

export async function scanTimus(params) {
  let {
    insert, name, systemType, update
  } = params;

  let tasksMeta = await getAllTasksMeta();
  socket.emitScannerConsoleLog(buildMessage('Список всех задач получен.'));
  socket.emitScannerConsoleLog(buildMessage('Получение полных условий для задач...'));
  await retrieveProblems(tasksMeta, params);

  return params;
}

async function getAllTasksMeta() {
  let endpoint = getEndpoint(ACM_PROBLEMSET_PATH);
  let logHash = passwordHash(Math.random().toString());
  let rows = [];
  let message = `Получение списка задач... Найдено: {0}.`;
  socket.emitScannerConsoleLog(
    buildMessage(message.replace('{0}', rows.length)),
    logHash
  );

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
      rows.push({
        internalSystemId,
        name
      });
    });
    socket.emitScannerConsoleLog(
      buildMessage(message.replace('{0}', rows.length)),
      logHash
    );
    return rows;
  });
}

async function retrieveProblems(tasksMeta, params) {
  let endpoint = getEndpoint(ACM_PROBLEM_PATH);
  let progressNumber = 0;
  let changed = [];
  let inserted = [];
  let progressEmitter = buildProgressMessage();
  let {
    insert, update
  } = params;

  return Promise.resolve(tasksMeta).map(async taskMeta => {
    let { htmlStatement, textStatement } = await retrieveProblem(taskMeta);

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

export async function retrieveProblem(taskMeta) {
  let endpoint = getEndpoint(ACM_PROBLEM_PATH);

  let body = await request({
    method: 'GET',
    uri: endpoint,
    qs: {
      space: 1,
      num: taskMeta.internalSystemId
    },
    simple: false,
    followAllRedirects: true,
    headers: {
      'Accept-Language': 'ru,en'
    }
  });

  const $ = cheerio.load(body);
  let content = $('.problem_content').parent().find('.problem_content');
  content.find('img').each(function () {
    let imgThis = $(this),
      src = imgThis.attr('src');
    if (src && src.indexOf(`http://${ACM_HOST}`) === -1) {
      imgThis.attr('src', `http://${ACM_HOST}` + src);
    }
  });
  let htmlStatement = '<div class="problem_content">' + content.html() + '</div>',
    textStatement = content.text();
  return { htmlStatement, textStatement }
}

function getEndpoint(pathTo = '') {
  return `${ACM_PROTOCOL}://${ACM_HOST}${pathTo}`;
}

function buildMessage(message = '') {
  return consoleMessagePattern.replace('{systemType}', SYSTEM_TYPE)
    .replace('{message}', message);
}

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
    message += `| <a target="_blank" href='/problems/${insertedProblem.id}'>${insertedProblem.title}</a> (<a target="_blank" href='http://acm.timus.ru/problem.aspx?space=1&num=${insertedProblem.foreignProblemIdentifier}'>${SYSTEM_TYPE}</a>) | добавлена |
    `;
  }
  for (let updatedProblem of changed) {
    message += `| <a target="_blank" href='/problems/${updatedProblem.id}'>${updatedProblem.title}</a> (<a target="_blank" href='http://acm.timus.ru/problem.aspx?space=1&num=${updatedProblem.foreignProblemIdentifier}'>${SYSTEM_TYPE}</a>) | обновлена |
    `;
  }
  if (!inserted.length && !changed.length) {
    message += `| - | - |
    `;
  }
  socket.emitScannerConsoleLog( message );
}