import { v1 as uuidv1 } from 'uuid';

export class Commit {

  hash = uuidv1();
  createdAtMs = Date.now();
  realCreatedAtMs;
  value = {};
  child = null;
  parent = null;

  constructor(value, realCreatedAtMs = Date.now()) {
    this.value = value;
    this.realCreatedAtMs = realCreatedAtMs;
  }
}