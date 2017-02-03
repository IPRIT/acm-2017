import * as models from "../../../models";
import Promise from 'bluebird';
import userGroups from './../../../models/User/userGroups';

export function createEjudgeProblemRequest(req, res, next) {
  return Promise.resolve().then(() => {
    return createEjudgeProblem(
      Object.assign(req.params, req.body)
    );
  }).then(result => res.json(result)).catch(next);
}

export async function createEjudgeProblem(params) {
  let {
    title = `Noname problem ${Math.random()}`,
    ejudgeContestId, ejudgeProblemIndex
  } = params;
  
  let foreignProblemIdentifier = `${ejudgeContestId}:${ejudgeProblemIndex}`;
  let systemType = 'ejudge';
  let attachments = {
    config: {
      replaced: true,
      markup: 'markdown',
      files_location: 'top'
    },
    files: [{
      type: 'pdf',
      url: 'https://drive.google.com/file/d/0B0FrUYTKg4DHalRhakd0TFFoS2M/view?usp=sharing',
      title: 'Statement'
    }],
    content: {
      text: '# <center>' + title + '</center> ↵↵Артем очень любит играть в шахматы. А еще он любит слонов! У Артема есть много слонов. Ему интересно, какое минимальное количество слонов можно расставить на шахматной доске размера <code is="math-tex"> n \\times n</code> так, чтобы они били все поле (любая клетка должна находиться на одной диагонали хотя бы с одним слоном; считается, что слон бьет и ту клетку, на которой стоит).↵↵![Флаги](http://acm.timus.ru/image/get.aspx/1e0688e4-87ea-453b-beff-fb57b5ea312a)↵↵## Входные данные↵Единственное число <code is="math-tex"> n, 1 \\leq  n \\leq  10^{18}</code>↵↵## Выходные данные↵Ответ на поставленную задачу.↵↵| Стандартный ввод         | Стандартный вывод     | ↵| ---------------------------------------- |----------------------------------------|↵| 3 1 1<br>4 4                       |  3.233434<br>2                |'.replace(/(↵)/gi, '\n')
    }
  };
  return models.Problem.create({
    systemType,
    foreignProblemIdentifier,
    title,
    htmlStatement: 'Условие отсутствует',
    textStatement: '',
    attachments: JSON.stringify(attachments)
  });
}