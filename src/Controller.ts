import { Model } from './Model';
import { Directory } from './Model';
import View from "./View";

// Controlador
export class Controller {
  private view: View;
  public model: Model;
  directory!: Directory;

  constructor(view: View) {
    this.model = view.model;
    this.model.initialize();
    this.view = view;
    this.view.initialize();


    this.model.initialize().then(() => {
      this.view.createSliderDateEventsListener();
    });

    // this.gitModel.getTree('7cd7dd736c253073b4a0f9cc0895d1e37ac398ca').then(root => {
    //   this.directory = this.gitModel.getDirectory(root);

    //   this.gitScapeView.createDirectoryView(this.directory, 0, 0);
    // });
    document.addEventListener('keydown', (event) => {
      if (event.code === 'Space') {
        this.animateCommits();
      }
    });
    // window.addEventListener('keydown', (event) => {
    //   if (event.key === 't') { // Cambia 't' a la tecla que quieras
    //     this.gitScapeModel.addPathToDirectory(this.directory, 'src/main/java/Prueba.java', true);
    //     this.gitScapeModel.addPathToDirectory(this.directory, 'src/main/antlr4/pruebas', false);
    //     this.gitScapeModel.removeElementFromDirectory(this.directory, 'src/main/java/letrain/command/CommandManager.java');
    //     this.gitScapeModel.removeElementFromDirectory(this.directory, '.idea');
    //     this.gitScapeView.clearScene();
    //     this.gitScapeView.createDirectoryView(this.directory, 0, 0);
    //   }
    // });
    this.view.animate();
  }
  async animateCommits() {
    const slider = document.getElementById('slider') as HTMLInputElement;
    var commitIndex = parseInt(slider.value, 10);
    while (commitIndex < this.model.allCommits.length) {
      await this.view.animateCommit(this.model.allCommits[commitIndex]);
      commitIndex++;
    }
  }



}
