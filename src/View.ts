import { Easing, Tween } from '@tweenjs/tween.js';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { Text } from 'troika-three-text';

import { Controller } from './Controller';
import { EventType, Folder, Model } from './Model';
import { GrowDirection, IMovingStrategy, MovingStrategy } from './MovingStrategy';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader';




// Carga el modelo

interface View {
  setStarted(): void;
  setStopped(): void;
  onStartSelected(): void; // Inicia el recorrido por los commits
  onStopSelected(): void; // Detiene el recorrido por los commits
  onSliderChanged(index: number): void; // El usuario mueve el slider, se avisa al modelo y luego el modelo nos avisa del cambio con update

}

export default class ViewImpl implements View {

  private readonly folderColor = 0xAA5555;
  private readonly fileColor = 0x5555AA;
  private readonly fileBorderColor = 0x999999;
  private readonly fileTextColor = 0x00ff00;
  private readonly folderTextColor = 0x000000;
  private readonly lineColor = 0x999999;

  private drawGrow: 'l' | 'r' | 'u' | 'd' = 'r';
  private drawMode: 'h' | 'v' = 'h';

  private folderWidth = 1;
  private folderHeight = .3;
  private folderPanelDepth = 0.05;

  private fileWidth = 1;
  private fileHeight = .3;
  private filePanelDepth = 0.1;
  private movingStrategy!: IMovingStrategy;


  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer | undefined;
  private tween!: Tween<THREE.Vector3>;
  private controls: OrbitControls | undefined;
  private folder!: Folder;
  private controller!: Controller;
  private model!: Model;
  private elements: { [path: string]: THREE.Group } = {};
  private treeGroup!: THREE.Group<THREE.Object3DEventMap>;
  private ambientLight!: THREE.AmbientLight;
  private started: boolean = false;
  private slider!: HTMLInputElement;
  private dateInput!: HTMLInputElement;
  private visiblePullRequests: Set<string> = new Set<string>();
  private programmers: {
    [programmer: string]: {
      //spotLight: THREE.Mesh<THREE.SphereGeometry, THREE.MeshBasicMaterial, THREE.Object3DEventMap>,
      spotLight: THREE.SpotLight,
      programmerText: Text,
      commitText: Text,
      astronaut: THREE.Group<THREE.Object3DEventMap>
    }
  } = {};
  private pullRequests: {
    [number: number]: {
      graphicObject: THREE.Group<THREE.Object3DEventMap>,
      folder: Folder,
    }
  } = {};
  public setModel(model: Model) {
    this.model = model;
  }
  public setController(controller: Controller) {
    this.controller = controller;
  }
  public setStarted(): void {
    this.started = true;
  }
  public setStopped(): void {
    this.started = false;
  }
  async initialize(): Promise<void> {
    this.movingStrategy = new MovingStrategy();
    this.movingStrategy.setGrowingDirections(GrowDirection.R, GrowDirection.U);
    this.movingStrategy.setDistances(this.folderWidth, this.folderHeight, this.fileWidth, this.fileHeight);
    this.createScene();
    this.createCamera();
    this.createLights();
    this.createTween();
    this.createRenderer();
    this.createOrbitControls();
    this.createSlider();
    this.createDateInput();
    this.addEventListeners();
    this.animate();
    this.clearScene();
    this.start();
  }

  private addEventListeners() {
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    window.addEventListener('click', (event) => {
      // Actualiza la posición del mouse
      mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

      // Actualiza el rayo con la cámara y la posición del mouse
      raycaster.setFromCamera(mouse, this.camera);

      // Calcula los objetos que intersectan
      const intersects = raycaster.intersectObjects(this.scene.children, true);

      if (intersects.length > 0) {
        // El primer objeto intersectado es el más cercano
        const object = intersects[0].object;
        const folder = object.getObjectByName('folder');
        folder?.children.forEach((child) => {
          if (child instanceof Text) {
            console.log(child);
          }
        });
      }
    }, false);
    this.model.onChange(EventType.FolderChange, () => this.onFolderChange());
    this.model.onChange(EventType.RepositoryChange, () => this.onRepositoryChange());
    this.model.onChange(EventType.CurrentCommitChange, () => this.onCurrentCommitChange());
    this.slider.addEventListener('input', () => {
      const commitIndex = parseInt(this.slider.value, 10);
      this.onSliderChanged(commitIndex);
    });
    window.addEventListener('resize', () => this.onWindowResize(), false);
    document.addEventListener('keydown', async (event) => {
      if (event.code === 'Space') {
        if (!this.started) {
          this.started = true;
          this.onStartSelected();
        } else {
          this.started = false;
          this.onStopSelected();
        }
      }
      if (event.shiftKey) {
        if (event.code === 'KeyH') {
          this.movingStrategy.setFolderGrowDirection(GrowDirection.L);
          this.movingStrategy.setFileGrowDirection(GrowDirection.U);
        } else if (event.code === 'KeyJ') {
          this.movingStrategy.setFolderGrowDirection(GrowDirection.D);
          this.movingStrategy.setFileGrowDirection(GrowDirection.L);
        } else if (event.code === 'KeyK') {
          this.movingStrategy.setFolderGrowDirection(GrowDirection.U);
          this.movingStrategy.setFileGrowDirection(GrowDirection.R);
        } else if (event.code === 'KeyL') {
          this.movingStrategy.setFolderGrowDirection(GrowDirection.R);
          this.movingStrategy.setFileGrowDirection(GrowDirection.D);
        }
      } else {
        if (event.code === 'KeyH') {
          this.movingStrategy.setFolderGrowDirection(GrowDirection.L);
          this.movingStrategy.setFileGrowDirection(GrowDirection.D);
        } else if (event.code === 'KeyJ') {
          this.movingStrategy.setFolderGrowDirection(GrowDirection.D);
          this.movingStrategy.setFileGrowDirection(GrowDirection.R);
        } else if (event.code === 'KeyK') {
          this.movingStrategy.setFolderGrowDirection(GrowDirection.U);
          this.movingStrategy.setFileGrowDirection(GrowDirection.L);
        } else if (event.code === 'KeyL') {
          this.movingStrategy.setFolderGrowDirection(GrowDirection.R);
          this.movingStrategy.setFileGrowDirection(GrowDirection.U);
        }
      }
      this.movingStrategy.setDistances(this.folderWidth, this.folderHeight, this.fileWidth, this.fileHeight);
      this.start();
    });
  }
  private async onCurrentCommitChange() {
    if (this.started) {
      const currentCommit = this.model.getCurrentCommit();
      const pullRequest = this.model.getPullRequestForCommit(currentCommit.sha);
      if (pullRequest && !this.visiblePullRequests.has(pullRequest.number)) {
        this.visiblePullRequests.add(pullRequest.number);
      }
      await this.animateCommit(currentCommit);
    }
    this.slider.value = this.model.getCommitIndex().toString();
    const datetime = this.model.getCurrentCommit().commit.author.date;
    this.dateInput.value = datetime.toLocaleString();
  }
  private onFolderChange() {
    this.clearScene();
    this.paintView(this.model.getFolder(), this.treeGroup);
  }
  private onRepositoryChange() {
    this.slider.max = (this.model.getCommitCount() - 1).toString();
    this.clearScene();
    this.paintView(this.model.getFolder(), this.treeGroup);
  }
  private createSlider() {
    this.slider = document.getElementById('slider') as HTMLInputElement;
  }
  private createDateInput() {
    this.dateInput = (document.getElementById('datetime') as HTMLInputElement);
  }

  private createScene() {
    this.scene = new THREE.Scene();
    this.treeGroup = new THREE.Group();
  }

  private createRenderer() {
    const canvas = document.getElementById("app");
    if (canvas instanceof HTMLCanvasElement) {
      this.renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
      });
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      document.body.appendChild(this.renderer.domElement);
    }
  }

  private createOrbitControls() {
    this.controls = new OrbitControls(this.camera, this.renderer!.domElement);
  }
  private createLights() {
    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(this.ambientLight);
  }

  private createCamera() {
    const fov = 45;
    const nearPlane = 1;
    const farPlane = 1000;
    this.camera = new THREE.PerspectiveCamera(
      fov,
      window.innerWidth / window.innerHeight,
      nearPlane,
      farPlane
    );
    this.camera.position.z = 10;
  }

  private createTween() {
    this.tween = new Tween(new THREE.Vector3(0, 0, 0));
  }

  onWindowResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer!.setSize(window.innerWidth, window.innerHeight);
  }

  onStartSelected(): void {
    this.controller.startSelected();
  }
  onStopSelected(): void {
    this.controller.stopSelected();
  }
  onSliderChanged(commitIndex: number): void {
    this.controller.commitIndexChanged(commitIndex);
  }

  animate(): void {
    window.requestAnimationFrame(() => this.animate());
    this.controls!.update();
    this.tween.update();
    this.renderer!.render(this.scene!, this.camera!);
  }

  public async clearScene() {
    this.scene!.remove(this.treeGroup);
    this.treeGroup = new THREE.Group();
    this.scene!.add(this.treeGroup);
  }


  public async start() {
    await this.clearScene();
    this.paintView(this.folder, this.treeGroup);
  }
  public paintView(folder: Folder, group: THREE.Group) {
    this.paintFolder(folder, group);
    if (folder.open) {
      this.paintFolderContent(folder, group);
      this.paintSubFolders(folder, group);
    }
  }
  public paintFolder(folder: Folder, group: THREE.Group) {
    const myGroup = new THREE.Group();
    myGroup.add(this.folderBox(folder.name ? folder.name : 'root'));
    group.add(myGroup);
  }
  public paintFolderContent(folder: Folder, group: THREE.Group) {
    let index = 0;
    const filesGroup = new THREE.Group();
    this.moveFirstFileDistance(filesGroup.position);
    for (const file of folder.files) {
      const fileGroup = new THREE.Group();
      let path = file;
      if (folder.name !== '') {
        path = folder.getPath() + "/" + file;
      }
      this.moveFileDistance(fileGroup.position, index);
      this.paintFile(file, fileGroup, path);
      filesGroup.add(fileGroup);
      index++;
    }
    group.add(filesGroup);
  }
  public paintFile(name: string, group: THREE.Group, path: string) {
    const myGroup = new THREE.Group();
    const fileBox = this.fileBox(name);
    this.elements[path] = fileBox;
    myGroup.add(fileBox);
    group.add(myGroup);
  }
  public paintSubFolders(folder: Folder, group: THREE.Group) {
    const subFoldersGroup = new THREE.Group();
    let lastNumSubFolders = 1;
    let index = 1;
    for (const subFolder of folder.subFolders) {
      const currentSubFolderGroup = new THREE.Group();
      this.moveSiblingDistance(currentSubFolderGroup.position, lastNumSubFolders);
      this.moveSonDistance(currentSubFolderGroup.position);
      this.paintView(subFolder, currentSubFolderGroup);
      // this.connect(subFolder, subFoldersGroup, lastNumSubFolders);
      subFoldersGroup.add(currentSubFolderGroup);
      lastNumSubFolders += subFolder.getNumSubFolders();
      index++;
    }
    group.add(subFoldersGroup);
  }

  public connect(folder: Folder, group: THREE.Group, numSubFolders: number) {
    const lineGroup = new (THREE.Group);
    const points = [];
    let point0 = new THREE.Vector3(0, 0, 0);
    let point1 = new THREE.Vector3(0, 0, 0);
    this.moveSiblingDistance(point1, numSubFolders);
    let point2 = new THREE.Vector3(0, 0, 0);
    this.moveSiblingDistance(point2, numSubFolders);
    this.moveSonDistance(point2);
    points.push(point0, point1, point2);
    const lineGeometry = new THREE.BufferGeometry().setFromPoints(points);
    const lineMaterial = new THREE.LineBasicMaterial({ color: this.lineColor });
    const line = new THREE.Line(lineGeometry, lineMaterial);
    lineGroup.add(line);
    group.add(lineGroup);
  }

  public folderBox(name: string) {
    return this.newBox(this.folderColor, name, this.folderWidth, this.folderHeight, this.folderPanelDepth);
  }
  public fileBox(name: string) {
    return this.newBox(this.fileColor, name, this.fileWidth, this.fileHeight, this.filePanelDepth);
  }
  public newBox(theColor: any, name: string = "unnamed", width: number, height: number, depth: number) {
    const boxGroup = new THREE.Group();
    const geometry = new THREE.BoxGeometry(width, height, depth);
    const material = new THREE.MeshLambertMaterial({ color: theColor });
    const boxMesh = new THREE.Mesh(geometry, material)
    boxMesh.name = "folder";
    boxGroup.add(boxMesh);
    const boxName = new Text();
    boxName.text = name;
    boxName.fontSize = 0.1;
    boxName.color = this.getComplementaryColor(theColor);
    boxName.anchorX = 'center';
    boxName.position.set(0, 0, (depth / 2) + 0.03);
    boxName.sync();
    boxGroup.add(boxName);
    return boxGroup;

  }
  public getComplementaryColor(hexColor: any) {
    let decimalColor = parseInt(hexColor, 16);
    let invertedColor = 0xFFFFFF ^ decimalColor;
    let invertedHexColor = ("000000" + invertedColor.toString(16)).slice(-6);
    return '#' + invertedHexColor;
  }
  moveSiblingDistance(point: THREE.Vector3, multiplyer: number = 1): void {
    this.movingStrategy.moveSiblingDistance(point, multiplyer);
  }
  moveSonDistance(point: THREE.Vector3): void {
    this.movingStrategy.moveSonDistance(point);
  }
  moveFileDistance(point: THREE.Vector3, multiplyer: number): void {
    this.movingStrategy.moveFileDistance(point, multiplyer);
  }
  moveFirstFileDistance(point: THREE.Vector3) {
    this.movingStrategy.moveFirstFileDistance(point);
  }
  async animateCommit(commit: any) {
    const programmer = commit.commit.author.email;

    if (!this.programmers[programmer]) {

      const programmerLabel = new Text();
      programmerLabel.text = programmer; // Establece el texto a la dirección de correo electrónico del programador
      programmerLabel.fontSize = 0.1;
      programmerLabel.color = 0xff0066; // Cambia esto al color que desees
      programmerLabel.anchorX = 'center';
      programmerLabel.position.y = 0.1; // Ajusta esto para cambiar la posición de la etiqueta sobre la esfera
      programmerLabel.sync();
      this.scene!.add(programmerLabel);

      const commitLabel = new Text();
      commitLabel.text = "";
      commitLabel.fontSize = 0.1;
      commitLabel.color = 0xff0066;
      commitLabel.anchorX = 'center';
      commitLabel.position.y = -0.3;
      commitLabel.sync();
      this.scene!.add(commitLabel);

      const sphereGeometry = new THREE.SphereGeometry(0.1, 10, 10);
      const sphereMaterial = new THREE.MeshBasicMaterial({ color: 0xff00ff });
      //const lightSphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
      //this.scene!.add(lightSphere);
      const spotLight = new THREE.SpotLight(0xffff00, 1, 0, Math.PI / 2);
      this.scene!.add(spotLight);
      this.programmers[programmer] = {
        //lightSphere: lightSphere,
        spotLight: spotLight,
        programmerText: programmerLabel,
        commitText: commitLabel,
        astronaut: new THREE.Group()
      };

      const loader = new OBJLoader();
      loader.load('../assets/11070_astronaut_v4.obj', (astronaut) => {
        this.scene!.add(astronaut);
        this.programmers[programmer].astronaut = astronaut;
        // Asegúrate de que el astronauta comienza en la misma posición que la esfera de luz
        astronaut.scale.set(.002, .002, .002);
        // set the material of the astronaut
        astronaut.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.material = new THREE.MeshPhongMaterial({ color: 0xddddff });
          }
        });
        this.programmers[programmer].astronaut.position.copy(this.programmers[programmer].spotLight.position);
        astronaut.rotateX(-Math.PI / 2);
        astronaut.rotateZ(Math.PI);
      });
    }
    this.programmers[programmer].commitText.text = commit.commit.message;
    await this.moveProgrammerToWorkOrbit(programmer).then(() => {
      this.model.getCommitFiles(commit.sha).then(async (files: any) => {
        for (const file of files!) {
          if (file.status === 'added') {
            await this.model.addFileOrFolder(commit.sha, file);
          }
          const fileObject = this.elements[file.filename];
          if (fileObject) {
            let position = new THREE.Vector3();
            fileObject.getWorldPosition(position);
            // we use parent to obtain the absolute position of the file, relative to his parent group
            await this.moveProgrammerTo(programmer, position);
            // await this.makeFileGlow(fileObject);
          }
          if (file.status === 'removed') {
            this.model.removeElement(file.filename);
          }
        }
      }).then(() => {
        this.moveProgrammerToWaitOrbit(programmer)
          .then(() => {
            this.controller.commitAnimationFinished();
          });
      });
    });
  }

  public moveProgrammerToWaitOrbit(programmer: string): Promise<void> {
    return new Promise((resolve) => {
      // this.programmers[programmer].lightSphere.material.color.set(0x808080);
      const startPosition = this.programmers[programmer].spotLight.position.clone();
      const endPosition = this.programmers[programmer].spotLight.position.clone();
      endPosition.z = 2;
      this.tween = new Tween(startPosition)
        .to(endPosition, 1000)
        .easing(Easing.Cubic.InOut)
        .onUpdate(() => {
          // this.programmers[programmer].lightSphere.position.set(startPosition.x, startPosition.y, startPosition.z);
          this.programmers[programmer].spotLight.position.set(startPosition.x, startPosition.y, startPosition.z);
          this.programmers[programmer].spotLight.target.position.set(endPosition.x, endPosition.y, endPosition.z);
          this.programmers[programmer].programmerText.position.set(startPosition.x, startPosition.y + 0.3, startPosition.z + 0.1);
          this.programmers[programmer].commitText.position.set(startPosition.x, startPosition.y - 0.3, startPosition.z + 0.1);
          this.programmers[programmer].astronaut.position.set(startPosition.x, startPosition.y - 0.3, startPosition.z + 0.1);

        })
        .onComplete(() => {
          resolve();
        })
        .start();
    });
  }
  public moveProgrammerToWorkOrbit(programmer: string): Promise<void> {
    return new Promise((resolve) => {
      const startPosition = this.programmers[programmer].spotLight.position.clone();
      const endPosition = this.programmers[programmer].spotLight.position.clone();
      endPosition.z = 1;
      this.tween = new Tween(startPosition)
        .to(endPosition, 200)
        // .easing(Easing.Cubic.InOut)
        .onUpdate(() => {
          // this.programmers[programmer].lightSphere.position.set(startPosition.x, startPosition.y, startPosition.z);
          this.programmers[programmer].spotLight.position.set(startPosition.x, startPosition.y, startPosition.z);
          this.programmers[programmer].spotLight.target.position.set(endPosition.x, endPosition.y, endPosition.z);
          this.programmers[programmer].programmerText.position.set(startPosition.x, startPosition.y + 0.3, startPosition.z + 0.1);
          this.programmers[programmer].commitText.position.set(startPosition.x, startPosition.y - 0.3, startPosition.z + 0.1);
          this.programmers[programmer].astronaut.position.set(startPosition.x, startPosition.y - 0.3, startPosition.z + 0.1);
        })
        .onComplete(() => {
          // this.programmers[programmer].lightSphere.material.color.set(0xff00ff);
          resolve();
        })
        .start();
    });
  }

  async moveProgrammerTo(programmer: string, targetPosition: THREE.Vector3) {
    const startPosition = this.programmers[programmer].spotLight.position.clone();
    const endPosition = new THREE.Vector3(targetPosition.x, targetPosition.y - 1, targetPosition.z + 2);
    await new Promise<void>(resolve => {
      this.tween = new Tween(startPosition)
        .to(endPosition, 1000)
        .easing(Easing.Cubic.InOut)
        .onUpdate(() => {
          // this.programmers[programmer].lightSphere.position.set(startPosition.x, startPosition.y, 1);
          this.programmers[programmer].spotLight.position.set(startPosition.x, startPosition.y, 1);
          this.programmers[programmer].spotLight.target.position.set(targetPosition.x, targetPosition.y, targetPosition.z);
          this.programmers[programmer].programmerText.position.set(startPosition.x, startPosition.y + 0.3, 1 + 0.1);
          this.programmers[programmer].commitText.position.set(startPosition.x, startPosition.y - 0.3, 1 + 0.1);
          this.programmers[programmer].astronaut.position.set(startPosition.x, startPosition.y - 0.3, 1 + 0.1);
        })
        .onComplete(() => {
          resolve();
        })
        .start();
    });
    this.fireProgrammerRay(programmer, targetPosition);
  }

  fireProgrammerRay(programmer: string, targetPosition: THREE.Vector3) {
    const points = [];
    points.push(new THREE.Vector3(this.programmers[programmer].spotLight.position.x, this.programmers[programmer].spotLight.position.y, this.programmers[programmer].spotLight.position.z));
    points.push(new THREE.Vector3(targetPosition.x, targetPosition.y, targetPosition.z));
    const lineGeometry = new THREE.BufferGeometry().setFromPoints(points);
    const lineMaterial = new THREE.LineBasicMaterial({ color: 0x00ff00 });
    const line = new THREE.Line(lineGeometry, lineMaterial);
    this.scene!.add(line);
    this.programmers[programmer].spotLight.intensity = 1;
    setTimeout(() => {
      this.scene!.remove(line);
      this.programmers[programmer].spotLight.intensity = 0;
    }, 500);
  }

  async makeFileGlow(fileMesh: THREE.Mesh) {
    const originalMaterial = fileMesh.material;
    const glowingMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 }); // Cambia el color según lo necesites
    fileMesh.material = glowingMaterial;
    await new Promise(resolve => setTimeout(resolve, 300));
    fileMesh.material = originalMaterial;
  }
}
