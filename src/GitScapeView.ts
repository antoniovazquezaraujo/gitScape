import * as THREE from 'three';
import { Text } from 'troika-three-text';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { Easing, Tween } from '@tweenjs/tween.js';

import GitModel from './GitModel';
import { Directory } from './GitScapeModel';
export default class GitScapeView {
  private fov: number;
  private nearPlane: number;
  private farPlane: number;
  private canvasId: string;
  // private clock: THREE.Clock | undefined;
  // private stats: Stats | undefined;
  private controls: OrbitControls | undefined;
  private ambientLight: THREE.AmbientLight | undefined;
  private directionalLight: THREE.DirectionalLight | undefined;
  public scene: THREE.Scene | undefined;
  public camera: THREE.PerspectiveCamera | undefined;
  public renderer: THREE.WebGLRenderer | undefined;
  pointLight = new THREE.PointLight(0x00ff00, 1, 10);
  lightSphere: THREE.Mesh<THREE.SphereGeometry, THREE.MeshBasicMaterial, THREE.Object3DEventMap> | undefined;

  intensity = 1;
  gitModel: GitModel;
  private readonly directoryColor = 0x999999;


  private readonly fileColor = 0xcacc66;

  private readonly fileBorderColor = 0x999999;

  private readonly fileTextColor = 0x000000;

  private readonly folderTextColor = 0x000000;

  private readonly horizontalLineColor = 0x999999;

  private readonly verticalLineColor = 0x999999;
  elements: { [path: string]: THREE.Mesh } = {};
  tween!: Tween<THREE.Vector3>;
  spotLight!: THREE.SpotLight;

  constructor(canvasId: string, model: GitModel) {
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
    this.pointLight.position.set(1, 1, 1); // Ajusta la posición de la luz a la posición del objeto
    this.scene.add(this.pointLight);

    const canvas = document.getElementById(this.canvasId);
    if (canvas instanceof HTMLCanvasElement) {
      this.renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
      });
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      document.body.appendChild(this.renderer.domElement);

      // this.clock = new THREE.Clock();
      this.controls = new OrbitControls(this.camera, this.renderer.domElement);
      // this.stats = new Stats();
      // document.body.appendChild(this.stats.dom);

      // this.ambientLight = new THREE.AmbientLight(0x00ff00, 0.9);
      // this.scene.add(this.ambientLight);

      this.spotLight = new THREE.SpotLight(0xffffff, 1, 0, Math.PI / 1);
      this.scene.add(this.spotLight);

      this.directionalLight = new THREE.DirectionalLight(0x00ffff, 1);
      this.directionalLight.position.set(0, 5, 5);
      this.scene.add(this.directionalLight);
      // Crea una esfera para representar la luz
      const sphereGeometry = new THREE.SphereGeometry(0.1, 5, 5);
      const sphereMaterial = new THREE.MeshBasicMaterial({ color: 0xff00ff });
      this.lightSphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
      this.scene.add(this.lightSphere);

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
    // Directory cube
    const geometry = new THREE.BoxGeometry(3, 0.4, 0.05);
    const material = new THREE.MeshLambertMaterial({ color: this.directoryColor });
    const cube = new THREE.Mesh(geometry, material);
    cube.position.set(xPosition, subLevel * spacing, 0);
    this.scene!.add(cube);
    let path = directory.getPath();
    this.elements[path] = cube;

    // Directory name
    const dirText = new Text();
    dirText.text = directory.name;
    dirText.fontSize = 0.1;
    dirText.color = this.folderTextColor;
    dirText.anchorX = 'center';
    dirText.position.set(xPosition, subLevel * spacing, 0.03);
    this.scene!.add(dirText);
    dirText.sync();

    // Line up to the parent directory
    const points = [];
    points.push(new THREE.Vector3(xPosition, subLevel * spacing, 0)); // start at the left side of the subdirectory cube
    points.push(new THREE.Vector3(xPosition - 2, subLevel * spacing, 0)); // go up to the bottom of the parent directory cube      
    const lineGeometry = new THREE.BufferGeometry().setFromPoints(points);
    const lineMaterial = new THREE.LineBasicMaterial({ color: this.horizontalLineColor });
    const line = new THREE.Line(lineGeometry, lineMaterial);
    this.scene!.add(line);

    // Files of this directory
    directory.files.forEach((file: any, index: any) => {

      // The file cube
      const fileGeometry = new THREE.BoxGeometry(3, 0.01, 0.2);
      const fileMaterial = new THREE.MeshLambertMaterial({
        color: this.fileColor,
        transparent: true,
        opacity: 1

      });
      const fileCube = new THREE.Mesh(fileGeometry, fileMaterial);
      fileCube.position.set(xPosition, (subLevel + 0.1) * spacing, index * 0.2 + 0.1);
      this.scene!.add(fileCube);
      let path = file;
      if (directory.name !== '') {
        path = directory.getPath() + "/" + file;
      }
      this.elements[path] = fileCube;

      // The border of the file cube
      const edges = new THREE.EdgesGeometry(fileGeometry);
      const line = new THREE.LineSegments(edges, new THREE.MeshLambertMaterial({ color: this.fileBorderColor }));
      line.position.set(xPosition, (subLevel + 0.1) * spacing, index * 0.2 + 0.1);
      this.scene!.add(line);


      // The file name text
      const fileText = new Text();
      fileText.text = file;
      fileText.fontSize = 0.1;
      fileText.color = this.fileTextColor;
      fileText.anchorX = 'center';
      fileText.position.set(xPosition, (subLevel + 0.05) * spacing, index * 0.2 + 0.2);
      fileText.rotation.x = Math.PI / 2;
      this.scene!.add(fileText);
      fileText.sync();
    });


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

  async animateCommits() {
    const slider = document.getElementById('slider') as HTMLInputElement;
    const startCommitIndex = parseInt(slider.value, 10);


    const commit = this.gitModel.allCommits[startCommitIndex];

    // Obtiene los archivos que cambiaron en este commit
    await this.gitModel.getCommitFiles(commit.sha).then(async (files) => {

      // Para cada archivo que cambió...
      for (const file of files!) {
        // Encuentra el objeto 3D correspondiente a este archivo
        const fileObject = this.elements[file.filename];

        if (fileObject) {

          await this.moveDirectionalLightTo(fileObject.position);

        }
      }
    });

  }
  async moveDirectionalLightTo(targetPosition: THREE.Vector3) {
    if (this.directionalLight && this.lightSphere) {
      const startPosition = this.lightSphere.position.clone();
      const endPosition = new THREE.Vector3(targetPosition.x, targetPosition.y - 1, targetPosition.z + 2);

      // Primera animación: mueve la esfera hasta la posición encima del archivo
      await new Promise<void>(resolve => {
        this.tween = new Tween(startPosition)
          .to(endPosition, 1000)
          .easing(Easing.Cubic.InOut)
          .onUpdate(() => {
            this.directionalLight!.position.set(startPosition.x, startPosition.y, startPosition.z);
            this.lightSphere!.position.set(startPosition.x, startPosition.y, startPosition.z);
            this.spotLight.position.set(startPosition.x, startPosition.y, startPosition.z);
            this.spotLight.target.position.set(targetPosition.x, targetPosition.y, targetPosition.z);
          })
          .onComplete(() => {
            resolve();
          })
          .start();
      });


      await this.castLightRay(targetPosition);

    }
  }

  async castLightRay(targetPosition: THREE.Vector3) {
    const points = [];
    points.push(new THREE.Vector3(this.lightSphere!.position.x, this.lightSphere!.position.y, this.lightSphere!.position.z));
    points.push(new THREE.Vector3(targetPosition.x, targetPosition.y, targetPosition.z));
    const lineGeometry = new THREE.BufferGeometry().setFromPoints(points);
    const lineMaterial = new THREE.LineBasicMaterial({ color: 0x00ff00 });
    const line = new THREE.Line(lineGeometry, lineMaterial);
    this.scene!.add(line);
    if (this.spotLight) {
      this.spotLight.intensity = 1;
    }

    // Espera 1 segundo y elimina la línea
    await new Promise<void>(resolve => {
      setTimeout(() => {
        this.scene!.remove(line);
        if (this.spotLight) {
          this.spotLight.intensity = 0;
        }
        resolve();
      }, 500);
    });
  }
}
