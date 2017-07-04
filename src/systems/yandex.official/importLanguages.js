import request from 'request-promise';
import cheerio from 'cheerio';
import * as yandex from "./index";
import * as models from '../../models';
import { getEndpoint } from "../../utils/utils";

export async function importLanguages(contestNumber, systemAccount) {
  let languages = await retrieveLanguages({ contestNumber }, systemAccount);
  for (let language of languages) {
    let existingLanguage = await models.Language.findOne({
      where: {
        systemType: 'yandexOfficial',
        foreignLanguageId: language.foreignLanguageId
      }
    });
    if (language.foreignLanguageId && language.name && !existingLanguage) {
      await models.Language.create(language);
    }
  }
  return contestNumber;
}

export async function retrieveLanguages(taskMeta, systemAccount) {
  let endpoint = getEndpoint(yandex.YANDEX_CONTEST_HOST, yandex.YANDEX_CONTEST_PROBLEMS, {
    contestNumber: taskMeta.contestNumber
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
  let $select = $('.select__control');
  return Array.from($select.find('option.select__option')).map(option => {
    let $option = $(option);
    return {
      foreignLanguageId: $option.val(),
      name: $option.text(),
      systemType: 'yandexOfficial',
      languageFamily: $option.val()
    }
  });
}