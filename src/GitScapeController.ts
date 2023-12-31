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


  // TODO: only an idea. Not working
  public async showCommitEffects() {
    this.gitModel.getCommits().then(commit => {
      commit.data.forEach(element => {
        this.gitModel.getCommitFiles(element.sha).then(allFiles => {
          allFiles?.forEach(file => {
            const mesh = this.gitScapeView.elements[file.filename];
            if (mesh != undefined) {
              setInterval(() => {
                (mesh.material as THREE.MeshBasicMaterial).color.set(0x000000);
              }, 1000);
            } else {
              // file from commit is not in the structure!
            }
          });
        });
      });
    });
  }
}
