import Disposable from "./disposable";
import { CellRepositoryBranch } from "./cell-repository";

export class Cell extends Disposable {

  repository = new CellRepositoryBranch();
  isAccepted = false;
  acceptedCommit;
  wrongAttempts = 0;

  /* possible commit value and his properties:
  * 1. sentAtMs
  * 2. solutionId
  * 3. vertictId
  * */


  constructor() {
    super();
  }

  addWrongAttempt(object) {
    if (!this.isAccepted) {
      this.wrongAttempts++;
      this.repository.commit(object, object.sentAtMs);
    }
  }

  accept(object) {
    if (!this.isAccepted) {
      this.isAccepted = true;
      this.acceptedCommit = this.repository.commit(object, object.sentAtMs);
    }
  }

  removeAttempt(solutionId) {
    // todo:
    // 1. remove from commit list
    // 2. if accepted commit then find new accepted commit and set it as accepted
    // 3. if wrong attempt then decrease the number of wrong attempts
  }
}