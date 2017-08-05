import { v4 as uuidv4 } from 'uuid';

export class Commit {

  hash = uuidv4();
  createdAtMs = Date.now();
  realCreatedAtMs;
  value = {};
  child = null;
  parent = null;

  constructor(value, realCreatedAtMs = Date.now()) {
    this.value = value;
    this.realCreatedAtMs = realCreatedAtMs;
  }

  get({ plain = false }) {
    if (plain) {
      let objectClone = Object.assign({}, this);
      // remove circular references
      objectClone.child = objectClone.child ? objectClone.child.hash : null;
      objectClone.parent = objectClone.parent ? objectClone.parent.hash : null;
      return objectClone;
    }
    return this;
  }
}