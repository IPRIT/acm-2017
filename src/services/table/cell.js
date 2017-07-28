import Disposable from "./disposable";
import { CellRepository } from "./cell-repository";

export class Cell extends Disposable {

  repository = new CellRepository();

  constructor() {
    super();
  }
}