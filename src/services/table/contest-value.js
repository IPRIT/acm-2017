export class ContestValue {

  startTimeMs;
  absoluteDurationTimeMs;
  absoluteFreezeTimeMs;
  absolutePracticeDurationTimeMs;

  constructor({ startTimeMs, absoluteDurationTimeMs, absoluteFreezeTimeMs, absolutePracticeDurationTimeMs }) {
    this.startTimeMs = startTimeMs;
    this.absoluteDurationTimeMs = absoluteDurationTimeMs;
    this.absoluteFreezeTimeMs = absoluteFreezeTimeMs;
    this.absolutePracticeDurationTimeMs = absolutePracticeDurationTimeMs;
  }

  isFrozenIn(timeMs) {
    return this.absoluteFreezeTimeMs <= timeMs && timeMs <= this.absoluteDurationTimeMs;
  }

  isPracticeIn(timeMs) {
    return timeMs > this.absoluteDurationTimeMs;
  }

  isMainTimeIn(timeMs) {
    return this.startTimeMs <= timeMs && timeMs < this.absoluteFreezeTimeMs;
  }

  get isContestFrozen() {
    return this.isFrozenIn( Date.now() );
  }

  get isPracticeTime() {
    return this.isPracticeIn( Date.now() );
  }

  get isMainTime() {
    return this.isMainTimeIn( Date.now() );
  }
}