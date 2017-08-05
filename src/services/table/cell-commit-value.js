export class CellCommitValue {

  solutionId;
  isAccepted = false;
  wrongAttempts = 0;
  sentAtMs;

  constructor(solutionId, isAccepted = false, wrongAttempts = 0, sentAtMs = Date.now()) {
    this.solutionId = solutionId;
    this.isAccepted = isAccepted;
    this.wrongAttempts = wrongAttempts;
    this.sentAtMs = sentAtMs;
  }
}