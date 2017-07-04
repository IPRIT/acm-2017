import request from 'request-promise';
import Promise from 'bluebird';
import cheerio from 'cheerio';
import * as yandex from "./index";
import * as socket from '../../socket';
import * as models from '../../models';
import { getEndpoint, parseYandexIdentifier } from "../../utils/utils";

export async function importProblems(contestNumber, systemAccount) {
  socket.emitYandexContestImportConsoleLog( yandex.buildConsoleMessage('Импортирование задач...') );

  let problems = await getAllTasksMeta(contestNumber, systemAccount);

  return Promise.resolve(problems).map(async problem => {
    let { htmlStatement, textStatement, foreignProblemIdentifier } = await retrieveProblem(problem, systemAccount);

    let existingProblem = await models.Problem.findOne({
      where: {
        systemType: 'yandex',
        foreignProblemIdentifier
      }
    });
    if (existingProblem) {
      return existingProblem;
    }

    let newProblem = await models.Problem.create({
      systemType: 'yandex',
      foreignProblemIdentifier,
      title: problem.name,
      htmlStatement,
      textStatement
    });
    await newProblem.createProblemVersionControl({
      versionNumber: 1,
      title: problem.name,
      htmlStatement,
      textStatement
    });

    return newProblem;
  }, { concurrency: 3 }).tap(problems => {
    printResults(problems);
  });
}

export async function getTaskMeta({ contestNumber, symbolIndex }, systemAccount) {
  let metas = await getAllTasksMeta(contestNumber, systemAccount);
  return metas.filter(meta => {
    return meta.symbolIndex === symbolIndex;
  })[0];
}

export async function getAllTasksMeta(contestNumber, systemAccount) {
  let endpoint = getEndpoint(yandex.YANDEX_CONTEST_HOST, yandex.YANDEX_CONTEST_PROBLEMS, { contestNumber }, {}, yandex.YANDEX_PROTOCOL);
  let { jar } = systemAccount;

  let response = await request({
    method: 'GET',
    uri: endpoint,
    simple: false,
    resolveWithFullResponse: true,
    followAllRedirects: true,
    jar
  });
  if (!response.body || ![ 200, 302 ].includes(response.statusCode)) {
    throw new Error('Server is not available');
  }
  const $ = cheerio.load( response.body );
  return Array.from($('.tabs-menu_role_problems').find('li')).map(li => {
    return $(li).text();
  }).map(problem => {
    let problemSymbolRegexp = /^([a-zA-Z0-9]+)\./i;
    let problemNameRegexp = /([a-zA-Z0-9]+\.\s)?(.+)/i;
    return {
      symbolIndex: problem.match(problemSymbolRegexp)[1],
      name: problem.match(problemNameRegexp)[2],
      contestNumber
    }
  });
}

export async function retrieveProblem(problem, systemAccount) {
  let endpoint = getEndpoint(yandex.YANDEX_CONTEST_HOST, yandex.YANDEX_CONTEST_PROBLEM, {
    contestNumber: problem.contestNumber,
    symbolIndex: problem.symbolIndex
  }, {}, yandex.YANDEX_PROTOCOL);
  let { jar } = systemAccount;

  let response = await request({
    method: 'GET',
    uri: endpoint,
    simple: false,
    resolveWithFullResponse: true,
    followAllRedirects: true,
    jar
  });
  if (!response.body || ![ 200, 302 ].includes(response.statusCode)) {
    throw new Error('Server is not available');
  }
  const $ = cheerio.load( response.body );
  let statement = $('.problem-statement');
  if (!statement.length) {
    statement = $('.problem__statement')
  }
  statement.find('*').each(function () {
    let $element = $(this);
    let classes = $element.attr('class');
    if (!classes) {
      return;
    }
    classes = classes.split(' ');
    for (let j = 0; j < classes.length; ++j) {
      classes[j] = 'task__my-' + classes[j];
    }
    $element.attr('class', classes.join(' '));
  });
  statement.find('img').each(function () {
    let imgThis = $(this),
      src = imgThis.attr('src');
    if (src && src.indexOf(`http`) === -1) {
      imgThis.attr('src', `https://${yandex.YANDEX_CONTEST_HOST}` + src);
    }
  });
  statement.find('a').each(function () {
    let link = $(this),
      href = link.attr('href');
    if (href && href.indexOf(`http`) === -1) {
      link.attr('href', `https://${yandex.YANDEX_CONTEST_HOST}` + href);
    }
  });
  let htmlStatement = statement.html(),
    textStatement = statement.text(),
    foreignProblemIdentifier = `${problem.contestNumber}:${problem.symbolIndex}`;

  return {
    htmlStatement,
    textStatement,
    foreignProblemIdentifier
  };
}

function printResults(inserted) {
  let message = `
    Добавлено задач: \`${inserted.length}\`.
    
    | Название задачи | Действие |
    | ------------- | :------------- |
  `;
  for (let insertedProblem of inserted) {
    let parsedProblemIdentifier = parseYandexIdentifier(insertedProblem.foreignProblemIdentifier);
    message += `| <a target="_blank" href='/problems/${insertedProblem.id}'>${insertedProblem.title}</a> (<a target="_blank" href='https://contest.yandex.ru/contest/${parsedProblemIdentifier.contestNumber}/problems/${parsedProblemIdentifier.symbolIndex}'>yandex</a>) | добавлена |
    `;
  }
  if (!inserted.length) {
    message += `| - | - |
    `;
  }
  socket.emitYandexContestImportConsoleLog( message );
}