import * as utils from "../../utils/utils";
import * as yandex from './index';

export async function getCompilationError(solution, systemAccount, receivedRow) {
  let parsedProblemIdentifier = utils.parseYandexIdentifier(solution.Problem.foreignProblemIdentifier);
  let endpoint = utils.getEndpoint(yandex.YANDEX_CONTEST_HOST, yandex.YANDEX_CONTEST_RUN_REPORT, {
    contestNumber: parsedProblemIdentifier.contestNumber,
    solutionId: receivedRow.solutionId
  }, {}, yandex.YANDEX_PROTOCOL);

  let $ = await yandex.$getPage(endpoint, systemAccount);
  return $('.snippet.snippet_role_log').text() || 'Not Available';
}