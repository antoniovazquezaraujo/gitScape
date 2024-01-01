import { GitScapeModel } from './GitScapeModel';
import GitModel from './GitModel';
import { Directory } from './GitScapeModel';
import GitScapeView from "./GitScapeView";

// Controlador
export class GitScapeController {
  private gitModel: GitModel;
  private gitScapeView: GitScapeView;
  private gitScapeModel: GitScapeModel;
  directory!: Directory;

  constructor(dataModel: GitScapeModel, view: GitScapeView) {
    this.gitScapeModel = dataModel;
    this.gitModel = dataModel.gitModel;
    this.gitScapeView = view;
    this.gitScapeView.initialize();

    this.gitModel.initialize().then(() => {
      console.log("first commit:" + this.gitModel.getFirstCommit().commit.author.date);
      console.log("last commit:" + this.gitModel.getLastCommit().commit.author.date);
      this.gitScapeView.createSliderDateEventsListener();
    });

    this.gitModel.getTree('7cd7dd736c253073b4a0f9cc0895d1e37ac398ca').then(root => {
      this.directory = this.gitModel.getDirectory(root);

      this.gitScapeView.createDirectoryView(this.directory, 0, 0);
    });
    document.addEventListener('keydown', (event) => {
      if (event.code === 'Space') {
        this.gitScapeView.animateCommits();
      }
    });
    window.addEventListener('keydown', (event) => {
      if (event.key === 't') { // Cambia 't' a la tecla que quieras
        this.gitScapeModel.addPathToDirectory(this.directory, 'src/main/java/Prueba.java', true);
        this.gitScapeModel.addPathToDirectory(this.directory, 'src/main/antlr4/pruebas', false);
        this.gitScapeModel.removeElementFromDirectory(this.directory, 'src/main/java/letrain/command/CommandManager.java');
        this.gitScapeModel.removeElementFromDirectory(this.directory, '.idea');
        this.gitScapeView.clearScene();
        this.gitScapeView.createDirectoryView(this.directory, 0, 0);
      }
    });
    this.gitScapeView.animate();
  }



}
