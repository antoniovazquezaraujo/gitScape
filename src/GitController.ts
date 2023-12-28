import GitModel from "./GitModel";
import GitView from "./GitView";

// Controlador
export class GitController {
    private model: GitModel;
    private view: GitView;
  
    constructor(model: GitModel, view: GitView) {
      this.model = model;
      this.view = view;
      this.view.initialize();
  
      this.model.getTree('7cd7dd736c253073b4a0f9cc0895d1e37ac398ca').then(root => {
        const directory = model.getDirectory(root);
        this.view.createDirectoryView(directory, 0, 0);
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
  