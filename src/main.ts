import './style.css'

import { GitScapeModel } from './GitScapeModel';
import GitModel from './GitModel';
import GitScapeView from './GitScapeView';
import { GitScapeController } from './GitScapeController';


const gitModel = new GitModel();
const dataModel = new GitScapeModel(gitModel);
const view = new GitScapeView("app", gitModel);
new GitScapeController(dataModel, view);



