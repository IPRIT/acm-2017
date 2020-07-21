import Promise from 'bluebird';
import request from 'request-promise';
import cheerio from 'cheerio';
import * as socket from '../../../../../socket';
import * as models from '../../../../../models';
import * as accountsPool from "../../../../../systems/cf/accountsPool";
import { extractParam, ensureNumber, passwordHash } from "../../../../../utils";
import { parseIdentifier, parseProblemIdentifier } from "../../../../../utils/utils";
import * as accountsMethods from "../../../../../systems/cf/account";
import { authVerify } from "../../../../../systems/cf";
import { cache as languagesCache } from "../../../../contest/methods";

const SYSTEM_TYPE = 'cf';
const ACM_PROTOCOL = 'http';
const ACM_HOST = 'codeforces.com';

const ACM_PROBLEMSET_PATH = '/problemset/page/:pageNumber';
const ACM_GYMS_PATH = '/gyms/page/:pageNumber';

const ACM_PROBLEMSET_PROBLEM_PATH = '/problemset/problem/:contestNumber/:symbolIndex';
const ACM_PROBLEMSET_SUBMIT_PATH = '/problemset/submit/:contestNumber/:symbolIndex';
const ACM_GYM_PROBLEMS_PATH = '/gym/:contestNumber';
const ACM_GYM_PROBLEM_PATH = '/gym/:contestNumber/problem/:symbolIndex';

const consoleMessagePattern = '[{systemType}] {message}';

export async function scanCf(params) {
  let {
    insert, name, systemType, update
  } = params;

  // problemset scanning
  socket.emitScannerConsoleLog(buildMessage(`Сканирование архива...`));

  let problemsetMeta = await getAllProblemsetMeta();
  socket.emitScannerConsoleLog(buildMessage(`Ссылки на задачи из архива получены.`));
  socket.emitScannerConsoleLog(buildMessage('Получение полных условий для задач из архива...'));
  try {
    if (insert || update) {
      await retrieveProblemset(problemsetMeta, params);
    }
  } catch (err) {
    socket.emitScannerConsoleLog(buildMessage(`Error: ${err.message}`));
  }

  // gyms scanning
  socket.emitScannerConsoleLog(`-----`);
  socket.emitScannerConsoleLog(buildMessage(`Сканирование тренировок...`));

  let gymsMeta = [];
  if (insert || update) {
    gymsMeta = await getAllGymsMeta();
  }
  socket.emitScannerConsoleLog(buildMessage(`Ссылки на задачи из тренировок получены.`));
  socket.emitScannerConsoleLog(buildMessage('Получение полных условий для задач из тренировок...'));
  try {
    if (insert || update) {
      await retrieveGyms(gymsMeta, params);
    }
  } catch (err) {
    socket.emitScannerConsoleLog(buildMessage(`Error: ${err.message}`));
  }

  // languages scanning
  socket.emitScannerConsoleLog(`-----`);
  socket.emitScannerConsoleLog(buildMessage(`Сканирование актуальных языков...`));
  try {
    await retrieveLanguages( problemsetMeta[0] );
  } catch (err) {
    socket.emitScannerConsoleLog(buildMessage(`Error: ${err.message}`));
  }

  return params;
}

async function getAllProblemsetMeta() {
  let logHash = passwordHash(Math.random().toString());
  let rows = [];
  let message = `Получение списка задач из архива... Найдено: {0}.`;
  socket.emitScannerConsoleLog(
    buildMessage(message.replace('{0}', rows.length)),
    logHash
  );

  let lastPageNumber = await getLastPageNumber(
    getEndpoint(ACM_PROBLEMSET_PATH, {
      pageNumber: 1
    })
  );

  for (let pageNumber = 1; pageNumber <= lastPageNumber; ++pageNumber) {
    let endpoint = getEndpoint(ACM_PROBLEMSET_PATH, { pageNumber });
    let body = await request({
      method: 'GET',
      uri: endpoint,
      qs: {
        locale: 'ru'
      },
      simple: false,
      followAllRedirects: true,
      headers: {
        'Accept-Language': 'ru,en;q=0.8'
      }
    });

    const $ = cheerio.load(body);

    $('.problems').find('tr').slice(1).each((index, row) => {
      let $row = $(row);
      let identifier = $row.find('td').eq(0).text().trim(),
        name = $row.find('td').eq(1).find('div').eq(0).text().trim(),
        parsedIdentifier = parseIdentifier(identifier);
      rows.push({
        contestNumber: parsedIdentifier.contestNumber,
        symbolIndex: parsedIdentifier.symbolIndex,
        type: 'problemset',
        name
      });
    });
    socket.emitScannerConsoleLog(
      buildMessage(message.replace('{0}', rows.length)),
      logHash
    );
  }
  return rows;
}

async function retrieveProblemset(tasksMeta, params) {
  let progressNumber = 0;
  let changed = [];
  let inserted = [];
  let progressEmitter = buildProgressMessage();
  let {
    insert, update
  } = params;

  return Promise.resolve(tasksMeta).map(async taskMeta => {
    let { htmlStatement, textStatement } = await retrieveCfProblem(taskMeta);

    let problem = await models.Problem.findOne({
      where: {
        foreignProblemIdentifier: buildProblemIdentifier('problemset', taskMeta.contestNumber, taskMeta.symbolIndex),
        systemType: SYSTEM_TYPE
      }
    });
    if (!problem) {
      if (insert) {
        problem = await models.Problem.create({
          systemType: SYSTEM_TYPE,
          foreignProblemIdentifier: buildProblemIdentifier('problemset', taskMeta.contestNumber, taskMeta.symbolIndex),
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
  }, { concurrency: 20 }).then(() => {
    printResults(inserted, changed);
  });
}

async function getAllGymsMeta() {
  let logHash = passwordHash(Math.random().toString());
  let contestsNumber = [];
  let rows = [];
  let message = `Получение списка задач из тренировок... Найдено: {0}.`;
  socket.emitScannerConsoleLog(
    buildMessage(message.replace('{0}', rows.length)),
    logHash
  );

  let lastPageNumber = await getLastPageNumber(
    getEndpoint(ACM_GYMS_PATH, {
      pageNumber: 1
    })
  );

  for (let pageNumber = 1; pageNumber <= lastPageNumber; ++pageNumber) {
    let endpoint = getEndpoint(ACM_GYMS_PATH, { pageNumber });
    let body = await request({
      method: 'GET',
      uri: endpoint,
      qs: {
        locale: 'ru'
      },
      simple: false,
      followAllRedirects: true,
      headers: {
        'Accept-Language': 'ru,en;q=0.8'
      }
    });

    const $ = cheerio.load(body);

    let content = $('.datatable');
    content.find('tr[data-contestid]').each(function () {
      let _ = $(this);
      let contestNumber = _.attr('data-contestid');
      contestsNumber.push( ensureNumber(contestNumber) );
    });
  }

  for (let contestNumber of contestsNumber) {
    let endpoint = getEndpoint(ACM_GYM_PROBLEMS_PATH, { contestNumber });
    let body = await request({
      method: 'GET',
      uri: endpoint,
      qs: {
        locale: 'ru'
      },
      simple: false,
      followAllRedirects: true,
      headers: {
        'Accept-Language': 'ru,en;q=0.8'
      }
    });

    const $ = cheerio.load(body);

    $('.problems').find('tr').slice(1).each(function () {
      let _ = $(this),
        tds = _.find('td');
      if (!tds.length) {
        return;
      }
      let taskIndex = tds.eq(0).text().trim(),
        taskName = tds.eq(1).find('div').eq(0).find('div').eq(0).find('a').text().trim();
      rows.push({
        symbolIndex: taskIndex.toUpperCase(),
        contestNumber,
        type: 'gym',
        name: taskName
      });
    });
    socket.emitScannerConsoleLog(
      buildMessage(message.replace('{0}', rows.length)),
      logHash
    );
  }

  return rows;
}

async function retrieveGyms(tasksMeta, params) {
  let progressNumber = 0;
  let changed = [];
  let inserted = [];
  let progressEmitter = buildProgressMessage();
  let {
    insert, update
  } = params;

  return Promise.resolve(tasksMeta).map(async taskMeta => {
    let { htmlStatement, textStatement, attachments } = await retrieveCfProblem(taskMeta);
    let stringifiedAttachments = typeof attachments === 'object' ? JSON.stringify(attachments) : attachments;

    let problem = await models.Problem.findOne({
      where: {
        foreignProblemIdentifier: buildProblemIdentifier('gym', taskMeta.contestNumber, taskMeta.symbolIndex),
        systemType: SYSTEM_TYPE
      }
    });
    if (!problem) {
      if (insert) {
        problem = await models.Problem.create({
          systemType: SYSTEM_TYPE,
          foreignProblemIdentifier: buildProblemIdentifier('gym', taskMeta.contestNumber, taskMeta.symbolIndex),
          title: taskMeta.name,
          htmlStatement,
          textStatement,
          attachments: stringifiedAttachments
        });
        let versionNumber = await models.ProblemVersionControl.getCurrentVersion(problem.id);
        await problem.createProblemVersionControl({
          htmlStatement,
          textStatement,
          title: taskMeta.name,
          versionNumber: versionNumber + 1,
          attachments: stringifiedAttachments
        });
        inserted.push(problem);
      }
    } else if (problem.htmlStatement !== htmlStatement) {
      if (update) {
        await problem.update({
          htmlStatement,
          textStatement,
          title: taskMeta.name,
          attachments: stringifiedAttachments
        });
        let versionNumber = await models.ProblemVersionControl.getCurrentVersion(problem.id);
        await problem.createProblemVersionControl({
          htmlStatement,
          textStatement,
          title: taskMeta.name,
          versionNumber: versionNumber + 1,
          attachments: stringifiedAttachments
        });
        changed.push(problem);
      }
    }
    ++progressNumber;
    progressEmitter(progressNumber / tasksMeta.length * 100);
  }, { concurrency: 20 }).then(() => {
    printResults(inserted, changed);
    socket.emitScannerConsoleLog(`finished`);
  });
}

async function retrieveLanguages (problemMeta) {
  const {
    contestNumber,
    symbolIndex
  } = problemMeta;

  const submitUrl = getEndpoint(ACM_PROBLEMSET_SUBMIT_PATH, {
    contestNumber,
    symbolIndex
  });

  let systemAccount = await accountsPool.getFreeAccount();
  systemAccount.busy();

  try {
    await authVerify( systemAccount );
  } catch (err) {
    await accountsMethods.login( systemAccount );
  }

  let { jar } = systemAccount;

  let body = await request({
    method: 'GET',
    uri: submitUrl,
    qs: {
      locale: 'ru'
    },
    jar,
    simple: false,
    followAllRedirects: true,
    headers: {
      'Accept-Language': 'ru,en;q=0.8'
    }
  });

  const $ = cheerio.load( body );
  let languages = [];
  $('[name="programTypeId"]').find('option').each(function () {
    const el = $(this);
    languages.push([ el.attr('value'), el.text() ]);
  });

  languages.sort((a, b) => a[0] - b[0]);
  languages = languages.map(language => {
    return {
      foreignLanguageId: parseInt( language[ 0 ] ),
      name: language[ 1 ]
    };
  });

  socket.emitScannerConsoleLog(
    languages.reduce((a, v) => {
      return a + `| ${v.foreignLanguageId} | ${v.name} |
      `;
    }, `
      | Внешний ID языка | Имя языка |
      | ------------- | :------------- |
      `)
  );

  const savedLanguages = await models.Language.findAll({
    where: {
      systemType: 'cf'
    }
  });

  // create map of saved languages by foreignLanguageId
  const savedLanguagesMap = new Map();
  for (const savedLanguage of savedLanguages) {
    savedLanguagesMap.set( parseInt( savedLanguage.foreignLanguageId ), savedLanguage );
  }

  // mark all cf's languages as nonactive
  await models.Language.update({
    nonactive: true
  }, {
    where: { systemType: 'cf' }
  });

  const oldLangs = [];
  const newLangs = [];

  for (let i = 0; i < languages.length; ++i) {
    const language = languages[ i ];
    if (savedLanguagesMap.has( language.foreignLanguageId )) {
      const savedLanguage = savedLanguagesMap.get( language.foreignLanguageId );
      oldLangs.push( savedLanguage.id );
    } else {
      newLangs.push({
        name: language.name,
        systemType: 'cf',
        languageFamily: 'c_cpp',
        foreignLanguageId: language.foreignLanguageId,
        nonactive: false
      });
    }
  }

  // make selected languages active
  await models.Language.update({
    nonactive: false
  }, {
    where: {
      systemType: 'cf',
      id: {
        $in: oldLangs
      }
    }
  });

  // create new languages
  await models.Language.bulkCreate( newLangs );

  // clear languages cache
  languagesCache.delete( 'cf' );

  let message = `Программные языки обновлены. Всего активных языков: {0}. Добавлено новых: {1}. Оставлено старых: {2}. В архиве: {3}.`;
  socket.emitScannerConsoleLog(
    buildMessage(
      message.replace('{0}', languages.length)
        .replace('{1}', newLangs.length)
        .replace('{2}', oldLangs.length)
        .replace('{3}', savedLanguages.length - oldLangs.length)
    )
  );

  systemAccount.free();
}

export async function retrieveCfProblem(taskMeta, deepLevel = 0) {
  let endpoint;
  if (taskMeta.type === 'problemset') {
    endpoint = getEndpoint(ACM_PROBLEMSET_PROBLEM_PATH, taskMeta);
  } else if (taskMeta.type === 'gym') {
    endpoint = getEndpoint(ACM_GYM_PROBLEM_PATH, taskMeta);
  }

  let body = await request({
    method: 'GET',
    uri: endpoint,
    qs: {
      locale: 'ru'
    },
    simple: false,
    followAllRedirects: true,
    headers: {
      'Accept-Language': 'ru,en;q=0.8'
    }
  });

  const $ = cheerio.load(body);

  // fix the route bug from codeforces
  // sometimes we get main page instead of requested page
  if (isMainPage($) && deepLevel < 20) {
    // adding short timeout to get repair
    await Promise.delay(1000);
    return retrieveCfProblem(taskMeta, deepLevel + 1);
  }

  let content = $('.ttypography');
  let isPdf = false;
  let attachments = {
    config: {
      replaced: true,
      markup: "markdown",
      files_location: "top"
    },
    files: [],
    content: {
      text: ""
    }
  };
  if (!content.length) {
    // pdf
    isPdf = true;
    content = $('.datatable table').parent();
    let fileNumber = 1;
    content.find('a').each(function () {
      let hrefThis = $(this),
        href = hrefThis.attr('href');
      if (href && href.indexOf('http://codeforces.com') === -1) {
        if (!href.startsWith('http')) {
          hrefThis.attr('href', 'http://codeforces.com' + href);
        }
      }
      attachments.files.push({
        type: "pdf",
        url: hrefThis.attr('href'),
        title: `Условие ${fileNumber++}`
      });
    });
  }

  content.find('img').each(function () {
    let $img = $(this),
      src = $img.attr('src');
    if (src && src.indexOf('http://codeforces.com') === -1) {
      if (!src.startsWith('http')) {
        $img.attr('src', 'http://codeforces.com' + src);
      }
    }
  });
  content.find('*').each(function () {
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
  let htmlStatement = content.html(),
    textStatement = isPdf ? 'pdf' : content.text();
  if (!htmlStatement) {
    let pathTo = taskMeta.type === 'problemset'
      ? ACM_PROBLEMSET_PROBLEM_PATH : ACM_GYM_PROBLEM_PATH;
    isPdf = true;
    attachments.files.push({
      type: "pdf",
      url: getEndpoint(pathTo, taskMeta),
      title: `Условие`
    });
    htmlStatement = '';
  }
  return { htmlStatement, textStatement, attachments: isPdf ? attachments : '' }
}

async function getLastPageNumber(endpoint) {
  let body = await request({
    method: 'GET',
    uri: endpoint,
    qs: {
      locale: 'ru'
    },
    simple: false,
    followAllRedirects: true,
    headers: {
      'Accept-Language': 'ru,en;q=0.8'
    }
  });
  const $ = cheerio.load(body);
  let paginationElements = $('.pagination .page-index');
  if (paginationElements.length) {
    return ensureNumber( paginationElements.last().text().trim() );
  } else {
    return 1;
  }
}

function getEndpoint(pathTo = '', params = {}) {
  let uri = `${ACM_PROTOCOL}://${ACM_HOST}${pathTo}`;
  for (let param in params) {
    uri = uri.replace(new RegExp(`(\:${param})`, 'gi'), params[ param ]);
  }
  return uri;
}

function buildProblemIdentifier(namespace = 'problemset', contestNumber, symbolIndex) {
  return `${namespace}:${contestNumber}${symbolIndex}`;
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
    let parsedProblemIdentifier = parseProblemIdentifier(insertedProblem.foreignProblemIdentifier);
    if (parsedProblemIdentifier.type === 'problemset') {
      message += `| <a target="_blank" href='/problems/${insertedProblem.id}'>${insertedProblem.title}</a> (<a target="_blank" href='http://codeforces.com/problemset/problem/${parsedProblemIdentifier.contestNumber}/${parsedProblemIdentifier.symbolIndex}'>${SYSTEM_TYPE}</a>) | добавлена |
      `;
    } else if (parsedProblemIdentifier.type === 'gym') {
      message += `| <a target="_blank" href='/problems/${insertedProblem.id}'>${insertedProblem.title}</a> (<a target="_blank" href='http://codeforces.com/gym/${parsedProblemIdentifier.contestNumber}/problem/${parsedProblemIdentifier.symbolIndex}'>${SYSTEM_TYPE}</a>) | добавлена |
      `;
    }
  }
  for (let updatedProblem of changed) {
    let parsedProblemIdentifier = parseProblemIdentifier(updatedProblem.foreignProblemIdentifier);
    if (parsedProblemIdentifier.type === 'problemset') {
      message += `| <a target="_blank" href='/problems/${updatedProblem.id}'>${updatedProblem.title}</a> (<a target="_blank" href='http://codeforces.com/problemset/problem/${parsedProblemIdentifier.contestNumber}/${parsedProblemIdentifier.symbolIndex}'>${SYSTEM_TYPE}</a>) | обновлена |
      `;
    } else if (parsedProblemIdentifier.type === 'gym') {
      message += `| <a target="_blank" href='/problems/${updatedProblem.id}'>${updatedProblem.title}</a> (<a target="_blank" href='http://codeforces.com/gym/${parsedProblemIdentifier.contestNumber}/problem/${parsedProblemIdentifier.symbolIndex}'>${SYSTEM_TYPE}</a>) | обновлена |
      `;
    }
  }
  if (!inserted.length && !changed.length) {
    message += `| - | - |
    `;
  }
  socket.emitScannerConsoleLog( message );
}

function isMainPage($) {
  // tested for different pages
  // the shortest way is select elements with `topic` class name.
  return $('.topic').length > 0;
}