import cheerio from 'cheerio';
import request from 'request-promise';
import * as models from '../../models';
import * as yandex from './index';
import Promise from 'bluebird';
import * as utils from "../../utils";

export async function sendSolution(solution, systemAccount) {
  return Promise.resolve().then(async () => {
    try {
      await authVerify(systemAccount);
      console.log(`[System report] Yandex Official account [${systemAccount.instance.systemLogin}] verified.`);
    } catch (err) {
      console.log(`[System report] Refreshing Yandex Official account [${systemAccount.instance.systemLogin}]...`);
      await yandex.login(systemAccount);
    }

    let yandexProblemId = await getYandexProblemId(solution, systemAccount);
    let solutionForm = await getSolutionForm(yandexProblemId, solution, systemAccount);

    let contextRow = await submitSolution(yandexProblemId, solutionForm, solution, systemAccount);
    if (!contextRow) {
      throw new Error('Solution did not send');
    }
    await solution.update({
      internalSolutionIdentifier: `${systemAccount.instance.systemType}${contextRow.solutionId}`
    });
    return contextRow;
  });
}

async function getYandexProblemId(solution, systemAccount) {
  let parsedProblemIdentifier = utils.parseYandexIdentifier(solution.Problem.foreignProblemIdentifier);
  let endpoint = getSubmitsEndpoint(solution);
  const $ = await yandex.$getPage(endpoint, systemAccount);

  let requiredProblem = Array.from($('select[name=problemId]').find('option')).map(option => {
    let $option = $(option);
    return {
      text: $option.text(),
      value: $option.val()
    }
  }).find(problem => {
    return problem.text.startsWith(`${parsedProblemIdentifier.symbolIndex}.`);
  });
  return requiredProblem.value;
}

async function getSolutionForm(yandexProblemId, solution, systemAccount) {
  let endpoint = getSubmitsEndpoint(solution);
  const $ = await yandex.$getPage(endpoint, systemAccount);

  let $textarea = $(`[name="${yandexProblemId}@text"]`);
  let $element = $textarea.parent();
  while ($element.length && $element[0].name !== 'form' && $element[0].name !== 'body') {
    $element = $element.parent();
  }
  if (!$element.length || $element[0].name === 'body') {
    throw new Error('Form not found');
  }
  return getFormObject($element);
}

async function submitSolution(yandexProblemId, solutionForm, solution, systemAccount) {
  let form = {
    [`${yandexProblemId}@compilerId`]: solution.Language.foreignLanguageId,
    [`${yandexProblemId}@solution`]: 'text',
    [`${yandexProblemId}@text`]: utils.getSourceCodeWithWatermark(solution),
    sk: solutionForm.sk,
    retpath: solutionForm.retpath
  };
  let parsedProblemIdentifier = utils.parseYandexIdentifier(solution.Problem.foreignProblemIdentifier);
  let endpoint = utils.getEndpoint(yandex.YANDEX_CONTEST_HOST, yandex.YANDEX_CONTEST_SUBMIT, {
    contestNumber: parsedProblemIdentifier.contestNumber
  }, {}, yandex.YANDEX_PROTOCOL);
  let { jar } = systemAccount;

  let response = await request({
    method: 'POST',
    uri: endpoint,
    formData: form,
    simple: false,
    resolveWithFullResponse: true,
    followAllRedirects: true,
    encoding: 'utf8',
    jar
  });
  if (!response.body || ![ 200, 302 ].includes(response.statusCode)) {
    throw new Error('Solution did not send');
  }
  const $ = cheerio.load( response.body );
  let rows = getSubmits($, parsedProblemIdentifier.symbolIndex);

  for (let row of rows) {
    let existSolution = await models.Solution.findOne({
      where: {
        internalSolutionIdentifier: `${systemAccount.instance.systemType}${row.solutionId}`
      }
    });
    if (existSolution) {
      throw new Error('Solution did not send');
    }
    return row;
  }
}

export function getSubmitsEndpoint(solution) {
  let parsedProblemIdentifier = utils.parseYandexIdentifier(solution.Problem.foreignProblemIdentifier);
  return utils.getEndpoint(yandex.YANDEX_CONTEST_HOST, yandex.YANDEX_CONTEST_SUBMITS, {
    contestNumber: parsedProblemIdentifier.contestNumber
  }, {}, yandex.YANDEX_PROTOCOL);
}

export function getSubmits($page, parsedSymbolIndex) {
  let $warning = $page('.msg_type_warn');
  if ($warning.length) {
    throw new Error(`Solution has warning. ${$warning.text()}`);
  }
  let submitRows = Array.from(
    $page('.table.table_role_submits').find('tr').slice(1)
  );

  let rows = [];
  for (let row of submitRows) {
    let $row = $page(row);
    let solutionId = utils.ensureNumber( $row.find('td').eq(1).text().trim() );
    let symbolIndex = $row.find('td').eq(2).text().trim();
    let verdictName = $row.find('td').eq(4).text().trim();
    let _executionTimeRaw = $row.find('td').eq(6).text().trim();
    let _isSeconds = !_executionTimeRaw.includes( 'ms' );
    let _executionTimeNumber = utils.ensureNumber( clearNumber( $row.find('td').eq(6).text().trim() ) );
    let executionTime = _isSeconds
      ? _executionTimeNumber : _executionTimeNumber / 1000;
    let memory = utils.ensureNumber( clearNumber( $row.find('td').eq(7).text().trim() ) );
    let testNumber = utils.ensureNumber( $row.find('td').eq(8).text().trim() );

    // using == cause we don't know what type `obj.symbolIndex` has
    if (parsedSymbolIndex == symbolIndex) {
      rows.push({
        solutionId, symbolIndex, verdictName,
        executionTime, memory, testNumber
      });
    }
  }
  return rows;
}

async function authVerify(systemAccount) {
  let isAuth = await yandex.isAuth(systemAccount);
  if (!isAuth) {
    throw new Error('Account is not logged in');
  }
}

function getFormObject($form) {
  let form = {};
  Array.from($form.find('input,textarea')).forEach(input => {
    form[ input.attribs.name ] = input.attribs.value;
  });
  return form;
}

function clearNumber(str) {
  return str.replace(/([a-zA-Z]+)$/i, '');
}