import GitModel, { Directory } from "./GitModel";
import GitView from "./GitView";

// Controlador
export class GitController {
  private model: GitModel;
  private view: GitView;
  directory!: Directory;

  constructor(model: GitModel, view: GitView) {
    this.model = model;
    this.view = view;
    this.view.initialize();

    this.model.getTree('7cd7dd736c253073b4a0f9cc0895d1e37ac398ca').then(root => {
      this.directory = model.getDirectory(root);
      this.view.createDirectoryView(this.directory, 0, 0);
    });

    window.addEventListener('keydown', (event) => {
      if (event.key === 't') { // Cambia 't' a la tecla que quieras
        this.model.addPathToDirectory(this.directory, 'src/main/java/Prueba.java', true);
        this.model.addPathToDirectory(this.directory, 'src/main/antlr4/pruebas', false);
        this.model.removeElementFromDirectory(this.directory, 'src/main/java/letrain/command/CommandManager.java');
        this.model.removeElementFromDirectory(this.directory, '.idea');
        this.view.clearScene();
        this.view.createDirectoryView(this.directory, 0, 0);
      }
    });
    this.view.animate();
  }

  // private animate() {
  //   requestAnimationFrame(() => this.animate());

  //   // Actualizar el modelo
  //   // Renderizar la vista
  //   this.view.animate();
  // }
}
