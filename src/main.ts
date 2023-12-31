import './style.css'
 
import  GitModel  from './GitModel';
import  GitView  from './GitView';
import { GitController } from './GitController';
 
const model = new GitModel();
const view = new GitView("app", model);
new GitController(model, view);


 
