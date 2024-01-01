import * as THREE from 'three';
import { Text } from 'troika-three-text';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { Easing, Tween } from '@tweenjs/tween.js';

import GitModel from './GitModel';
import { Directory } from './GitScapeModel';

export default class GitScapeView {
  public scene: THREE.Scene | undefined;
  public camera: THREE.PerspectiveCamera | undefined;
  public renderer: THREE.WebGLRenderer | undefined;
  private controls: OrbitControls | undefined;
  private fov: number;
  private nearPlane: number;
  private farPlane: number;
  private canvasId: string;
  gitModel: GitModel;
  elements: { [path: string]: THREE.Mesh } = {};
  tween: Tween<THREE.Vector3>;
  ambientLight: THREE.AmbientLight;

  programmers: {
    [programmer: string]: {
      lightSphere: THREE.Mesh<THREE.SphereGeometry, THREE.MeshBasicMaterial, THREE.Object3DEventMap>,
      spotLight: THREE.SpotLight,
      label: Text
    }
  } = {};


  private readonly directoryColor = 0x999999;
  private readonly fileColor = 0xffffff;
  private readonly fileBorderColor = 0x999999;
  private readonly fileTextColor = 0x000000;
  private readonly folderTextColor = 0x000000;
  private readonly horizontalLineColor = 0x999999;
  private readonly verticalLineColor = 0x999999;

  constructor(canvasId: string, model: GitModel) {
    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.tween = new Tween(new THREE.Vector3(0, 0, 0));
    this.fov = 45;
    this.nearPlane = 1;
    this.farPlane = 1000;
    this.canvasId = canvasId;
    this.gitModel = model;
    this.initialize();
  }

  async initialize(): Promise<void> {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      this.fov,
      window.innerWidth / window.innerHeight,
      this.nearPlane,
      this.farPlane
    );
    this.camera.position.z = 10;

    const canvas = document.getElementById(this.canvasId);
    if (canvas instanceof HTMLCanvasElement) {
      this.renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
      });
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      document.body.appendChild(this.renderer.domElement);

      this.controls = new OrbitControls(this.camera, this.renderer.domElement);
      this.scene.add(this.ambientLight);
      window.addEventListener('resize', () => this.onWindowResize(), false);
    }
  }

  public async clearScene() {
    for (let i = this.scene!.children.length - 1; i >= 0; i--) {
      const object = this.scene!.children[i];
      if (!(object instanceof THREE.Camera) && !(object instanceof THREE.Light)) {
        this.scene!.remove(object);
      }
    }
  }
  public createDirectoryView(directory: Directory, subLevel: number, xPosition: number) {
    const spacing = 0.5;
    const dirX = xPosition;
    const dirY = subLevel * spacing;
    const horizontalLineShift = 2;
    const elementWidth = 1.5;
    const elementHeight = 0.5;
    // Directory group
    const dirGroup = new THREE.Group();

    // Directory cube
    const geometry = new THREE.BoxGeometry(elementWidth, elementHeight, 0.05);
    const material = new THREE.MeshLambertMaterial({ color: this.directoryColor });
    const dirCube = new THREE.Mesh(geometry, material);
    let path = directory.getPath();
    this.elements[path] = dirCube;
    dirGroup.add(dirCube);

    // Directory name
    const dirText = new Text();
    dirText.text = directory.name;
    dirText.fontSize = 0.1;
    dirText.color = this.folderTextColor;
    dirText.anchorX = 'center';
    dirText.position.z = 0.03;
    dirText.sync();
    dirGroup.add(dirText);

    dirGroup.position.set(dirX, dirY, 0);
    this.scene!.add(dirGroup);

    // Line up to the parent directory
    const points = [];
    points.push(new THREE.Vector3(dirX, dirY, 0)); // start at the left side of the subdirectory cube
    points.push(new THREE.Vector3(dirX - horizontalLineShift, dirY, 0)); // go left one level
    const lineGeometry = new THREE.BufferGeometry().setFromPoints(points);
    const lineMaterial = new THREE.LineBasicMaterial({ color: this.horizontalLineColor });
    const line = new THREE.Line(lineGeometry, lineMaterial);
    this.scene!.add(line);

    const filesGroup = new THREE.Group();
    // Files of this directory
    directory.files.forEach((file: any, index: any) => {
      // File group
      const fileGroup = new THREE.Group();

      // The file cube
      const fileGeometry = new THREE.BoxGeometry(elementWidth, .5, .2);
      const fileMaterial = new THREE.MeshLambertMaterial({
        color: this.fileColor,
        transparent: true,
        opacity: 1
      });
      const fileCube = new THREE.Mesh(fileGeometry, fileMaterial);
      fileGroup.add(fileCube);

      let path = file;
      if (directory.name !== '') {
        path = directory.getPath() + "/" + file;
      }
      this.elements[path] = fileCube;

      // The border of the file cube
      const edges = new THREE.EdgesGeometry(fileGeometry);
      const line = new THREE.LineSegments(edges, new THREE.MeshLambertMaterial({ color: this.fileBorderColor }));
      fileGroup.add(line);

      // Divide el nombre del directorio en varias líneas si es muy largo
      const maxCharsPerLine = 20; // Cambia esto según el tamaño del cubo
      const lines = file.match(new RegExp(`.{1,${maxCharsPerLine}}`, 'g')) || [];

      // Crea un objeto Text para cada línea
      for (let i = 0; i < lines.length; i++) {
        const fileText = new Text();
        fileText.text = lines[i];
        fileText.fontSize = 0.1;
        fileText.color = this.fileTextColor;
        fileText.anchorX = 'center';
        fileText.position.z = 0.2;
        fileText.position.y = 0.15 + (-i * 0.15); // Ajusta la posición y para cada línea
        fileText.sync();
        fileGroup.add(fileText);
      }

      fileGroup.position.set(((index + 1) * elementWidth) + dirX, (subLevel) * spacing, 0);
      filesGroup.add(fileGroup);

      document.addEventListener('keydown', (event) => {
        if (event.code === 'KeyX') {
          fileGroup.rotateX(Math.PI / 2);
        } else if (event.code === 'KeyY') {
          fileGroup.rotateY(Math.PI / 2);
        } else if (event.code === 'KeyZ') {
          fileGroup.rotateZ(Math.PI / 2);
        }
      });
    });
    this.scene!.add(filesGroup);

    // The subdirectories of this directory
    var lastLevel = subLevel * spacing;
    for (let key in directory.subdirectories) {
      let subdirectory = directory.subdirectories[key];

      // Line left   
      const points = [];
      points.push(new THREE.Vector3(xPosition, (subLevel - 1) * spacing, 0));
      points.push(new THREE.Vector3(xPosition, lastLevel, 0));
      const lineGeometry = new THREE.BufferGeometry().setFromPoints(points);
      const lineMaterial = new THREE.LineBasicMaterial({ color: this.verticalLineColor });
      const line = new THREE.Line(lineGeometry, lineMaterial);
      this.scene!.add(line);

      // Render the subdirectory
      subLevel = this.createDirectoryView(subdirectory, subLevel - 1, xPosition + 2);
    };
    return subLevel;
  }
  animate(): void {
    if (this.renderer && this.camera) { //&& this.stats && this.controls) {
      window.requestAnimationFrame(() => this.animate());
      this.renderer.render(this.scene!, this.camera);
      this.controls!.update();
      this.tween.update();
    }
  }


  onWindowResize(): void {
    if (this.camera && this.renderer) {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
  }

  public createSliderDateEventsListener() {
    const slider = document.getElementById('slider') as HTMLInputElement;
    slider.max = (this.gitModel.allCommits.length - 1).toString();
    slider.addEventListener('input', async (event) => {
      const slider = event.target as HTMLInputElement;
      const commitIndex = parseInt(slider.value, 10);

      const commit = this.gitModel.allCommits[commitIndex];

      if (commit) {
        const datetime = new Date(commit.commit.author.date);
        (document.getElementById('datetime') as HTMLInputElement).value = datetime.toLocaleString();

        const root = await this.gitModel.getTree(commit.sha);
        const directory = this.gitModel.getDirectory(root);
        this.clearScene();
        this.createDirectoryView(directory, 0, 0);
      }
    });
  }

  async animateCommit() {
    const slider = document.getElementById('slider') as HTMLInputElement;
    const startCommitIndex = parseInt(slider.value, 10);
    const commit = this.gitModel.allCommits[startCommitIndex];
    const programmer = commit.commit.author.email;

    if (!this.programmers[programmer]) {
      const label = new Text();
      label.text = programmer; // Establece el texto a la dirección de correo electrónico del programador
      label.fontSize = 0.1;
      label.color = 0xff0066; // Cambia esto al color que desees
      label.anchorX = 'center';
      label.position.y = 0.1; // Ajusta esto para cambiar la posición de la etiqueta sobre la esfera
      label.sync();
      this.scene!.add(label);

      const sphereGeometry = new THREE.SphereGeometry(0.1, 10, 10);
      const sphereMaterial = new THREE.MeshBasicMaterial({ color: 0xff00ff });
      const lightSphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
      this.scene!.add(lightSphere);
      const spotLight = new THREE.SpotLight(0xffff00, 1, 0, Math.PI / 2);
      this.scene!.add(spotLight);
      this.programmers[programmer] = {
        lightSphere,
        spotLight,
        label
      };
    } else {
      this.scene!.add(this.programmers[programmer].lightSphere);
      this.scene!.add(this.programmers[programmer].spotLight);
      this.scene!.add(this.programmers[programmer].label);
    }

    await this.gitModel.getCommitFiles(commit.sha).then(async (files) => {
      for (const file of files!) {
        const fileObject = this.elements[file.filename];
        if (fileObject) {
          // await this.moveDirectionalLightTo(fileObject.parent!.position);
          await this.moveProgrammerTo(programmer, fileObject.parent!.position);
          await this.makeFileGlow(fileObject);
        }
      }
    });
  }


  async moveProgrammerTo(programmer: string, targetPosition: THREE.Vector3) {
    const startPosition = this.programmers[programmer].lightSphere.position.clone();
    const endPosition = new THREE.Vector3(targetPosition.x, targetPosition.y - 1, targetPosition.z + 2);
    await new Promise<void>(resolve => {
      this.tween = new Tween(startPosition)
        .to(endPosition, 1000)
        .easing(Easing.Cubic.InOut)
        .onUpdate(() => {
          this.programmers[programmer].lightSphere.position.set(startPosition.x, startPosition.y, startPosition.z);
          this.programmers[programmer].spotLight.position.set(startPosition.x, startPosition.y, startPosition.z);
          this.programmers[programmer].spotLight.target.position.set(targetPosition.x, targetPosition.y, targetPosition.z);
          this.programmers[programmer].label.position.set(startPosition.x, startPosition.y + 0.3, startPosition.z + 0.1);
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
    points.push(new THREE.Vector3(this.programmers[programmer].lightSphere.position.x, this.programmers[programmer].lightSphere.position.y, this.programmers[programmer].lightSphere.position.z));
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
