import { Model } from './Model';
import View from "./View";

// Controlador
export interface Controller {
  commitAnimationFinished(): unknown;
  initialize(): void;
  commitIndexChanged(index: number): void;
  startSelected(): void;
  stopSelected(): void;
}
export class ControllerImpl implements Controller {
  private view!: View;
  private model!: Model;
  private looping = false;

  public setModel(model: Model) {
    this.model = model;
  }

  public setView(view: View) {
    this.view = view;
  }

  initialize(): void {
    this.view.setController(this);
    this.model.initialize();
    this.view.setModel(this.model);
    this.view.initialize();
  }

  commitIndexChanged(index: number): void {
    this.view.setStopped();
    this.model.setCommitIndex(index);
    this.model.reload();
  }
  startSelected(): void {
    this.looping = true;
    this.view.setStarted();
    let commitIndex = 0;
    this.model.setCommitIndex(commitIndex);
    this.nextSelected();
  }
  nextSelected(): void {
    let commitIndex = this.model.getCommitIndex();
    if (this.looping && commitIndex < this.model.getCommitCount()) {
      this.model.setCommitIndex(++commitIndex);
    }
  }
  stopSelected(): void {
    this.looping = false;
    this.view.setStopped();
  }
  commitAnimationFinished(): void {
    this.nextSelected();
  }
}
