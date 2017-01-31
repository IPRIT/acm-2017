import { typeCheck as isType } from 'type-check';
import crypto from 'crypto';

export function passwordHash(value) {
  return crypto.createHash('md5').update(value).digest('hex');
}

export function getSymbolIndex(index) {
  let symbols = 'abcdefghijklmnopqrstuvwxyz',
    intPart, modPart, symbolIndex = '';
  while (index >= 0) {
    intPart = Math.floor(index / symbols.length);
    modPart = index % symbols.length;
    symbolIndex += symbols[ modPart ];
    index = intPart - 1;
  }
  return symbolIndex.split('').reverse().join('');
}

export function getIntegerIndex(symbolIndex) {
  let symbols = 'abcdefghijklmnopqrstuvwxyz',
    index = 0, symbolNumber = 0;
  let symbolIndexArray = symbolIndex.toLowerCase().split('').reverse();
  while (symbolIndexArray.length) {
    let symbol = symbolIndexArray.shift();
    index += (symbols.indexOf( symbol ) + 1)
      * Math.pow(symbols.length, symbolNumber++);
  }
  return index - 1;
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