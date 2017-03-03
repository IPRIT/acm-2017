import { typeCheck as isType } from 'type-check';
import crypto from 'crypto';
import querystring from 'querystring';
import url from 'url';

export const SYNTAX_C_LIKE_LITERAL_COMMENT = '\n/* $1 */\n';
export const SYNTAX_PYTHON_LITERAL_COMMENT = '\n# $1\n';

export function passwordHash(value) {
  return crypto.createHash('md5').update(value).digest('hex');
}

export function getSymbolIndex(index) {
  let [ alphabetLength, symbolIndex ] = [ 26, '' ];
  while (index >= 0) {
    symbolIndex += String.fromCharCode( index % alphabetLength + 0x61 );
    index = Math.floor(index / alphabetLength) - 1;
  }
  return symbolIndex.split('').reverse().join('');
}

export function getIntegerIndex(symbolIndex) {
  let [ alphabetLength, index, symbolNumber ] = [ 26, 0, 0 ];
  let symbolIndexArray = symbolIndex.toLowerCase().split('').reverse();
  while (symbolIndexArray.length) {
    let symbol = symbolIndexArray.shift();
    index += ( symbol.charCodeAt(0) - 0x60 ) * Math.pow(alphabetLength, symbolNumber++);
  }
  return index - 1;
}

export function makeSourceWatermark({ solutionInstance, commentLiteral = SYNTAX_C_LIKE_LITERAL_COMMENT, whitespace = false } = {}) {
  if (whitespace) {
    let whitespacesNumber = Math.floor(Math.random() * 100) + 1;
    let watermark = '\n'.repeat(whitespacesNumber);
    let sourceCode = solutionInstance.sourceCode + watermark;
    return solutionInstance.update({ sourceCode });
  } else {
    let watermark = new Date().toString();
    let sourceCode = solutionInstance.sourceCode + watermark.replace(/^(.*)$/gi, commentLiteral);
    return solutionInstance.update({ sourceCode });
  }
}

export function appendWatermark(solutionInstance, language = solutionInstance.Language) {
  if ([ 'c_cpp', 'csharp', 'java', 'javascript', 'php' ].includes(language.languageFamily)) {
    return makeSourceWatermark({ solutionInstance });
  } else if ([ 'python' ].includes(language.languageFamily)) {
    return makeSourceWatermark({ solutionInstance, commentLiteral: SYNTAX_PYTHON_LITERAL_COMMENT });
  } else {
    return makeSourceWatermark({ solutionInstance, whitespace: true });
  }
}

export function valueBetween(value, min = -Infinity, max = Infinity) {
  if (min > max) {
    [ min, max ] = [ max, min ];
  }
  return Math.min(
    Math.max(Number(value), min),
    max
  );
}

export function extractParam(str, key) {
  if (typeof str !== 'string' || typeof key !== 'string') {
    return null;
  }
  return querystring.parse(url.parse(str).query)[ key ];
}

export function ensureNumber(value) {
  value = Number(value);
  if (Number.isNaN(value)) {
    return 0;
  }
  return value;
}

export function parseProblemIdentifier(problemIdentifier = '') {
  let [ type, problem ] = problemIdentifier.split(':');
  let contestNumber = ensureNumber(problem.match(/^(\d+)/i)[1]);
  let symbolIndex = problem.match(/\d+([a-zA-Zа-яА-Я]+)$/i)[1];
  return { type, contestNumber, symbolIndex };
}

export function capitalize(string = '') {
  return string.split(/\s+/)
    .map(part => part.toLowerCase())
    .map(part => {
      return part.slice(0, 1).toUpperCase() + part.slice(1)
    })
    .join(' ');
}

export class AsyncQueue {
  queue = [];
  inProcess = false;
  
  wait(element, cb) {
    return new Promise(resolve => {
      this.queue.push([ element, cb, resolve ]);
      this.added();
    })
  }
  
  added() {
    if (this.inProcess) {
      return;
    }
    this.process();
  }
  
  async process() {
    this.inProcess = true;
    let queuedElement;
    while (queuedElement = this.queue.shift()) {
      let [ element, process, resolver ] = queuedElement;
      resolver(await process(element));
    }
    this.inProcess = false;
  }
}

export function ensureValue(actual, type, defaultValue, fn = () => {}) {
  const regOppositeExpression = /\^\((.+)\)/i;
  
  let isOppositeType = type.startsWith('^');
  if (isOppositeType) {
    type = type.replace(regOppositeExpression, '$1');
  }
  let isProperlyType = isType(type, actual);
  if (isOppositeType) {
    isProperlyType = !isProperlyType;
  }
  if (!isProperlyType) {
    actual = defaultValue;
  }
  try {
    let regulatedValue = fn(actual, defaultValue);
    return isType('Undefined', regulatedValue) ?
      actual : regulatedValue;
  } catch (err) {
    return defaultValue;
  }
}