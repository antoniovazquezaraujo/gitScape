import './style.css'
import { ModelImpl } from './Model';
import ViewImpl from './View';
import { ControllerImpl } from './Controller';

const controller = new ControllerImpl();
const view = new ViewImpl();
const model = new ModelImpl();

view.setModel(model);
view.setController(controller);
controller.setModel(model);
controller.setView(view);
controller.initialize();





