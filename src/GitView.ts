import * as THREE from 'three';
import { Text } from 'troika-three-text';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

import GitModel from './GitModel';
import { Directory } from './GitModel';
export default class GitView {
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
  intensity = 1;
  model: GitModel;
  private readonly directoryColor = 0x999999;


  private readonly fileColor = 0xcacc66;

  private readonly fileBorderColor = 0x999999;

  private readonly fileTextColor = 0x000000;

  private readonly folderTextColor = 0x000000;

  private readonly horizontalLineColor = 0x999999;

  private readonly verticalLineColor = 0x999999;
  elements: { [path: string]: THREE.Mesh } = {};

  constructor(canvasId: string, model: GitModel) {
    this.fov = 45;
    this.nearPlane = 1;
    this.farPlane = 1000;
    this.canvasId = canvasId;
    this.model = model;
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

      this.ambientLight = new THREE.AmbientLight(0x00ff00, 0.9);
      this.scene.add(this.ambientLight);

      this.directionalLight = new THREE.DirectionalLight(0x00ffff, 1);
      this.directionalLight.position.set(0, 5, 5);
      this.scene.add(this.directionalLight);
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
    // Directory cube
    const geometry = new THREE.BoxGeometry(3, 0.4, 0.05);
    const material = new THREE.MeshLambertMaterial({ color: this.directoryColor });
    const cube = new THREE.Mesh(geometry, material);
    cube.position.set(xPosition, subLevel, 0);
    this.scene!.add(cube);
    let path = directory.getPath();
    this.elements[path] = cube;

    // Directory name
    const dirText = new Text();
    dirText.text = directory.name;
    dirText.fontSize = 0.1;
    dirText.color = this.folderTextColor;
    dirText.anchorX = 'center';
    dirText.position.set(xPosition, subLevel, 0.03);
    this.scene!.add(dirText);
    dirText.sync();

    // Line up to the parent directory
    const points = [];
    points.push(new THREE.Vector3(xPosition, subLevel, 0)); // start at the left side of the subdirectory cube
    points.push(new THREE.Vector3(xPosition - 2, subLevel, 0)); // go up to the bottom of the parent directory cube      
    const lineGeometry = new THREE.BufferGeometry().setFromPoints(points);
    const lineMaterial = new THREE.LineBasicMaterial({ color: this.horizontalLineColor });
    const line = new THREE.Line(lineGeometry, lineMaterial);
    this.scene!.add(line);

    // Files of this directory
    directory.files.forEach((file: any, index: any) => {

      // The file cube
      const fileGeometry = new THREE.BoxGeometry(3, 0.01, 0.2);
      const fileMaterial = new THREE.MeshBasicMaterial({
        color: this.fileColor,
        transparent: true,
        opacity: 0.9

      });
      const fileCube = new THREE.Mesh(fileGeometry, fileMaterial);
      fileCube.position.set(xPosition, subLevel + 0.1, index * 0.2 + 0.1);
      this.scene!.add(fileCube);
      let path = file;
      if (directory.name !== '') {
        path = directory.getPath() + "/" + file;
      }
      this.elements[path] = fileCube;

      // The border of the file cube
      const edges = new THREE.EdgesGeometry(fileGeometry);
      const line = new THREE.LineSegments(edges, new THREE.MeshLambertMaterial({ color: this.fileBorderColor }));
      line.position.set(xPosition, subLevel + 0.1, index * 0.2 + 0.1);
      this.scene!.add(line);


      // The file name text
      const fileText = new Text();
      fileText.text = file;
      fileText.fontSize = 0.1;
      fileText.color = this.fileTextColor;
      fileText.anchorX = 'center';
      fileText.position.set(xPosition, subLevel + 0.09, index * 0.2 + 0.2);
      fileText.rotation.x = Math.PI / 2;
      this.scene!.add(fileText);
      fileText.sync();
    });


    // The subdirectories of this directory
    var lastLevel = subLevel;
    for (let key in directory.subdirectories) {
      let subdirectory = directory.subdirectories[key];

      // Line left   
      const points = [];
      points.push(new THREE.Vector3(xPosition, subLevel - 1, 0));
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
    }
  }


  onWindowResize(): void {
    if (this.camera && this.renderer) {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
  }
  public async showCommitEffects() {
    this.model.getCommits().then(commit => {
      commit.data.forEach(element => {
        this.model.getCommitFiles(element.sha).then(allFiles => {
          allFiles?.forEach(file => {
            const mesh = this.elements[file.filename];
            if (mesh != undefined) {
              setInterval(() => {
                (mesh.material as THREE.MeshBasicMaterial).color.set(this.getRandomColor());
              }, 1000);
            } else {
              // file from commit is not in the structure!
            }
          });
        });
      });
    });
  }
  public getRandomColor() {
    const r = Math.floor(Math.random() * 256);
    const g = Math.floor(Math.random() * 256);
    const b = Math.floor(Math.random() * 256);
    return `rgb(${r},${g},${b})`;
  }
}
