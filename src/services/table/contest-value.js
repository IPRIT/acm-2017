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
}