import { Easing, Tween } from '@tweenjs/tween.js';
import * as THREE from 'three';
import { InteractionManager } from 'three.interactive';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { Text } from 'troika-three-text';

import { Controller } from './Controller';
import { EventType, TreeNode } from './TreeNodeModel';
import { GrowDirection, IMovingStrategy, MovingStrategy } from './MovingStrategy';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader';
import { Model } from './Model';




// Carga el modelo

interface View {
  setStarted(): void;
  setStopped(): void;
  onStartSelected(): void; // Inicia el recorrido por los commits
  onStopSelected(): void; // Detiene el recorrido por los commits
  onSliderChanged(index: number): void; // El usuario mueve el slider, se avisa al modelo y luego el modelo nos avisa del cambio con update

}

interface ProgrammerEntry {
  programmerText: Text;
  commitText: Text;
  astronaut: THREE.Group<THREE.Object3DEventMap>;
  group: THREE.Group<THREE.Object3DEventMap>;
}

export default class ViewImpl implements View {

  private readonly folderColor = 0xAA5555;
  private readonly fileColor = 0x5555AA;
  // private readonly fileBorderColor = 0x999999;
  // private readonly fileTextColor = 0x00ff00;
  // private readonly folderTextColor = 0x000000;
  private readonly lineColor = 0x999999;
  private readonly cameraFitMargin = 1.2;
  private readonly cameraFitDuration = 700;
  private readonly doubleClickDelay = 250;


  private folderWidth = 1;
  private folderHeight = .3;
  private folderPanelDepth = 0.05;
  private closedNodeTriangleSize: number = 0.1;
  private fileWidth = 1;
  private fileHeight = .3;
  private filePanelDepth = 0.1;
  private movingStrategy!: IMovingStrategy;


  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer | undefined;
  private interactionManager!: InteractionManager;
  private tween!: Tween<THREE.Vector3>;
  private cameraTween: Tween<{ t: number }> | null = null;
  private controls: OrbitControls | undefined;
  private controller!: Controller;
  private model!: Model;
  private astronaut!: THREE.Group<THREE.Object3DEventMap>;
  private elements: { [path: string]: THREE.Group } = {};
  private treeGroup!: THREE.Group<THREE.Object3DEventMap>;
  private ambientLight!: THREE.AmbientLight;
  private started: boolean = false;
  private slider!: HTMLInputElement;
  private dateInput!: HTMLInputElement;
  private prevButton!: HTMLButtonElement;
  private nextButton!: HTMLButtonElement;
  private toggleCommits!: HTMLButtonElement;
  private homeButton!: HTMLButtonElement;
  private commitList!: HTMLUListElement;
  private visiblePullRequests: Set<string> = new Set<string>();
  private repaintAll: boolean = false;
  private hasAutoFitted: boolean = false;
  private pendingFolderClick: {
    node: TreeNode;
    object: THREE.Object3D;
    timer: number;
  } | null = null;
  private programmers: { [programmer: string]: ProgrammerEntry } = {};
  // Seguimiento del astronauta activo durante la reproducción: la cámara se
  // coloca detrás de su MIRADA (su espalda), no detrás de su movimiento.
  private followEnabled: boolean = false;
  private followTarget: ProgrammerEntry | null = null;
  private readonly followDistance = 2.5;
  private readonly followHeight = 0.8;
  private readonly followLerpSpeed = 4;
  private readonly followLookAhead = 0.4;
  private readonly followLookAheadHeight = 0.15;
  private readonly followDragThreshold = 5;
  // Mirada del astronauta en coordenadas de mundo (unitaria) y quaternion auxiliar.
  private readonly followFacing = new THREE.Vector3(0, 0, -1);
  private readonly followQuaternion = new THREE.Quaternion();
  private readonly followTargetPosition = new THREE.Vector3();
  private readonly followDesiredPosition = new THREE.Vector3();
  private readonly followLookTarget = new THREE.Vector3();
  private readonly clock = new THREE.Clock();
  private pointerStart: { x: number; y: number } | null = null;

  // Efectos de "toque": ráfaga de rayos de colores según el estado del fichero
  // y pulso blanco sutil (emissive) sobre el panel tocado.
  private readonly rayColorNeutral = 0xffff00;
  private readonly rayColorAdded = 0x00ff55;
  private readonly rayColorRemoved = 0xff2222;
  private readonly rayRadius = 0.04;
  private readonly rayLife = 0.16;
  private readonly rayStaggerMs = 100;
  private readonly rayOriginOffset = 0.2;
  private readonly rayFadeOpacity = 0.95;
  private readonly rayUp = new THREE.Vector3(0, 1, 0);
  private readonly activeRays: {
    mesh: THREE.Mesh<THREE.CylinderGeometry, THREE.MeshBasicMaterial>;
    elapsed: number;
    life: number;
  }[] = [];
  private readonly glowColorWhite = 0xffffff;
  private readonly glowIntensity = 0.5;
  private readonly glowDuration = 600;
  private glowTween: Tween<{ t: number }> | null = null;
  private glowMaterial: THREE.MeshLambertMaterial | null = null;
  private readonly glowBaseEmissive = new THREE.Color();

  // private pullRequests: {
  //   [number: number]: {
  //     graphicObject: THREE.Group<THREE.Object3DEventMap>,
  //     node: TreeNode,
  //   }
  // } = {};

  public setModel(model: Model) {
    this.model = model;
  }
  public setController(controller: Controller) {
    this.controller = controller;
  }
  public setStarted(): void {
    this.started = true;
    this.startFollowing();
  }
  public setStopped(): void {
    this.started = false;
    this.stopFollowing();
  }
  async initialize(): Promise<void> {
    this.movingStrategy = new MovingStrategy();
    this.movingStrategy.setGrowingDirections(GrowDirection.R, GrowDirection.U);
    this.movingStrategy.setDistances(this.folderWidth, this.folderHeight, this.fileWidth, this.fileHeight);
    this.createScene();
    this.createCamera();
    this.createLights();
    this.createAstronaut();
    this.createTween();
    this.createRenderer();
    this.createOrbitControls();
    this.createControls();
    this.addEventListeners();
    this.animate();
    this.clearScene();
    this.start();
  }

  async createAstronaut() {
    const loader = new OBJLoader();
    const astronaut: THREE.Group = await new Promise((resolve, reject) => {
      loader.load('../assets/11070_astronaut_v4.obj', resolve, undefined, reject);
    });

    astronaut.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.material = new THREE.MeshPhongMaterial({ color: 0xddddff });
      }
    });

    astronaut.scale.set(.002, .002, .002);
    astronaut.rotateX(-Math.PI / 2);
    astronaut.rotateZ(Math.PI);
    this.astronaut = astronaut;
  }
  private addEventListeners() {
    this.interactionManager = new InteractionManager(
      this.renderer!,
      this.camera,
      this.renderer!.domElement
    );
    this.model.onChange(EventType.TreeNodeChange, () => this.onTreeNodeChange());
    this.model.onChange(EventType.RepositoryChange, () => this.onRepositoryChange());
    this.model.onChange(EventType.CurrentCommitChange, () => this.onCurrentCommitChange());
    this.slider.addEventListener('input', () => {
      const commitIndex = parseInt(this.slider.value, 10);
      this.onSliderChanged(commitIndex);
    });
    this.prevButton.addEventListener('click', () => {
      if (parseInt(this.slider.value, 10) > 0) {
        this.slider.value = (parseInt(this.slider.value, 10) - 1).toString();
        this.onSliderChanged(parseInt(this.slider.value, 10));
      }
    });
    this.nextButton.addEventListener('click', () => {
      if (this.slider.value !== (this.model.getCommitCount() - 1).toString()) {
        this.slider.value = (parseInt(this.slider.value, 10) + 1).toString();
        this.onSliderChanged(parseInt(this.slider.value, 10));
      }
    });
    this.toggleCommits.addEventListener('click', () => {
      if (this.commitList.style.display === 'none') {
        this.commitList.style.display = 'block';
      } else {
        this.commitList.style.display = 'none';
      }

    });
    this.homeButton.addEventListener('click', () => this.focusHome());

    // Con los controles deshabilitados (seguimiento) OrbitControls no emite 'start',
    // así que detectamos aquí un arrastre real para salir del modo.
    const canvas = this.renderer!.domElement;
    canvas.addEventListener('pointerdown', (event: PointerEvent) => {
      this.pointerStart = { x: event.clientX, y: event.clientY };
    });
    canvas.addEventListener('pointermove', (event: PointerEvent) => {
      if (!this.followEnabled || !this.pointerStart) {
        return;
      }
      const dx = event.clientX - this.pointerStart.x;
      const dy = event.clientY - this.pointerStart.y;
      if (dx * dx + dy * dy > this.followDragThreshold * this.followDragThreshold) {
        this.stopFollowing();
      }
    });
    canvas.addEventListener('pointerup', () => {
      this.pointerStart = null;
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
      if (event.code === 'KeyC' || event.code === 'Escape') {
        this.focusHome();
      }
      if (event.code === 'KeyF') {
        this.toggleFollow();
      }
      let orientationChanged = false;
      if (event.shiftKey) {
        if (event.code === 'KeyH') {
          this.movingStrategy.setFolderGrowDirection(GrowDirection.L);
          this.movingStrategy.setFileGrowDirection(GrowDirection.U);
          orientationChanged = true;
        } else if (event.code === 'KeyJ') {
          this.movingStrategy.setFolderGrowDirection(GrowDirection.D);
          this.movingStrategy.setFileGrowDirection(GrowDirection.L);
          orientationChanged = true;
        } else if (event.code === 'KeyK') {
          this.movingStrategy.setFolderGrowDirection(GrowDirection.U);
          this.movingStrategy.setFileGrowDirection(GrowDirection.R);
          orientationChanged = true;
        } else if (event.code === 'KeyL') {
          this.movingStrategy.setFolderGrowDirection(GrowDirection.R);
          this.movingStrategy.setFileGrowDirection(GrowDirection.D);
          orientationChanged = true;
        }
      } else {
        if (event.code === 'KeyH') {
          this.movingStrategy.setFolderGrowDirection(GrowDirection.L);
          this.movingStrategy.setFileGrowDirection(GrowDirection.D);
          orientationChanged = true;
        } else if (event.code === 'KeyJ') {
          this.movingStrategy.setFolderGrowDirection(GrowDirection.D);
          this.movingStrategy.setFileGrowDirection(GrowDirection.R);
          orientationChanged = true;
        } else if (event.code === 'KeyK') {
          this.movingStrategy.setFolderGrowDirection(GrowDirection.U);
          this.movingStrategy.setFileGrowDirection(GrowDirection.L);
          orientationChanged = true;
        } else if (event.code === 'KeyL') {
          this.movingStrategy.setFolderGrowDirection(GrowDirection.R);
          this.movingStrategy.setFileGrowDirection(GrowDirection.U);
          orientationChanged = true;
        }
      }
      if (orientationChanged) {
        this.movingStrategy.setDistances(this.folderWidth, this.folderHeight, this.fileWidth, this.fileHeight);
        this.start();
      }
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
  private onTreeNodeChange() {
    this.repaintAll = true;
  }
  private doRepaintAll() {
    this.clearScene();
    this.paintView(this.model.getNode(), this.treeGroup);
    this.repaintAll = false;
    this.paintCommits();
  }
  private onRepositoryChange() {
    this.slider.max = (this.model.getCommitCount() - 1).toString();
    this.clearScene();
    this.paintView(this.model.getNode(), this.treeGroup);

    // Solo la primera vez tras cargar: encuadra el árbol para no empezar perdido.
    if (!this.hasAutoFitted) {
      this.hasAutoFitted = true;
      this.focusHome();
    }
  }

  createControls() {
    this.slider = document.getElementById('slider') as HTMLInputElement;
    this.dateInput = (document.getElementById('datetime') as HTMLInputElement);
    this.prevButton = document.getElementById('prev') as HTMLButtonElement;
    this.nextButton = document.getElementById('next') as HTMLButtonElement;
    this.toggleCommits = document.getElementById('toggleCommits') as HTMLButtonElement;
    this.homeButton = document.getElementById('home') as HTMLButtonElement;
    this.commitList = document.getElementById('commitList') as HTMLUListElement;
  }

  private createScene() {
    this.scene = new THREE.Scene();
    this.treeGroup = new THREE.Group();
  }

  async paintCommits() {
    // Llena la lista de commits usando model.getAllCommits
    const commitList = document.getElementById('commitList') as HTMLUListElement;
    commitList.innerHTML = '';
    const commits = this.model.getAllCommits();
    for (const commit of await commits) {
      const li = document.createElement('li');
      li.textContent = commit.commit.message;
      commitList.appendChild(li);
    }

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
    // Navegación más natural: el paneo se mueve en el plano de la pantalla
    // y el zoom acerca hacia el cursor.
    this.controls.screenSpacePanning = true;
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.1;
    this.controls.zoomToCursor = true;
    // Cualquier interacción manual sale del modo seguimiento y
    // cancela un vuelo de cámara en curso para no pelearse con él.
    this.controls.addEventListener('start', () => {
      this.stopFollowing();
      this.cancelCameraTween();
    });
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

  private focusHome(): void {
    this.stopFollowing();
    const box = this.getTreeBox();
    if (box) {
      this.animateCameraToBox(box);
    }
  }

  private focusFolder(folderElement: THREE.Object3D): void {
    this.stopFollowing();
    // El padre del panel de carpeta agrupa la carpeta y todo su contenido.
    const container = folderElement.parent?.parent ?? folderElement;
    const box = this.getObjectBox(container);
    if (box) {
      this.animateCameraToBox(box, 1.25);
    }
  }

  private startFollowing(): void {
    if (this.followEnabled) {
      return;
    }
    this.followEnabled = true;
    this.cancelCameraTween();
    if (this.controls) {
      this.controls.enabled = false;
    }
  }

  private stopFollowing(): void {
    this.followEnabled = false;
    if (this.controls) {
      this.controls.enabled = true;
    }
  }

  private toggleFollow(): void {
    if (this.followEnabled) {
      this.stopFollowing();
    } else if (this.followTarget) {
      this.startFollowing();
    }
  }

  private updateFollow(delta: number): void {
    if (!this.followEnabled || !this.followTarget) {
      return;
    }
    this.followTarget.group.getWorldPosition(this.followTargetPosition);
    this.followTarget.group.getWorldQuaternion(this.followQuaternion);

    // La mirada del astronauta es su "forward" local (0,0,-1) llevado al mundo.
    // El modelo no rota con el movimiento: la orientación va horneada en el clon
    // (rotateX(-π/2) + rotateZ(π) en createAstronaut). Verificado sobre el OBJ:
    // el modelo es Z-up y mira a −Y nativo (visores y manos detalladas a −Y; la
    // mochila al +Y). Esas rotaciones convierten −Y nativo en −Z mundial, es
    // decir, mira a los ficheros (plano Z≈0) desde las órbitas Z≈1/2. Si el grupo
    // llegara a rotar y la mirada apuntase en contra del árbol, la invertimos
    // para no colocar la cámara delante de su cara.
    this.followFacing.set(0, 0, -1).applyQuaternion(this.followQuaternion);
    if (this.followFacing.z > 0) {
      this.followFacing.negate();
    }

    // Detrás de su espalda y por encima: desired = targetPos − facing·D + (0,H,0).
    // Se ve su nuca y, más allá, el panel que está modificando.
    this.followDesiredPosition
      .copy(this.followTargetPosition)
      .addScaledVector(this.followFacing, -this.followDistance);
    this.followDesiredPosition.y += this.followHeight;

    const alpha = 1 - Math.exp(-this.followLerpSpeed * delta);
    this.camera.position.lerp(this.followDesiredPosition, alpha);

    // Mira un poco hacia delante (hacia los ficheros) y hacia arriba: encuadra
    // al astronauta centrado y el fichero que tiene delante.
    this.followLookTarget
      .copy(this.followTargetPosition)
      .addScaledVector(this.followFacing, this.followLookAhead);
    this.followLookTarget.y += this.followLookAheadHeight;
    this.controls!.target.lerp(this.followLookTarget, alpha);
  }

  private getTreeBox(): THREE.Box3 | null {
    if (!this.treeGroup) {
      return null;
    }
    return this.getObjectBox(this.treeGroup);
  }

  private getObjectBox(object: THREE.Object3D): THREE.Box3 | null {
    object.updateWorldMatrix(true, true);
    const box = new THREE.Box3().setFromObject(object);
    const bounds = [box.min.x, box.min.y, box.min.z, box.max.x, box.max.y, box.max.z];
    if (box.isEmpty() || bounds.some((value) => !Number.isFinite(value))) {
      return null;
    }
    return box;
  }

  private animateCameraToBox(box: THREE.Box3, margin: number = this.cameraFitMargin): void {
    const center = box.getCenter(new THREE.Vector3());
    const radius = Math.max(box.getSize(new THREE.Vector3()).length() / 2, 0.1);
    // Distancia que encaja la esfera envolvente respetando fov y aspect ratio.
    const verticalFov = THREE.MathUtils.degToRad(this.camera.fov);
    const horizontalFov = 2 * Math.atan(Math.tan(verticalFov / 2) * this.camera.aspect);
    const distance = Math.max((margin * radius) / Math.sin(Math.min(verticalFov, horizontalFov) / 2), 2.5);

    // Conserva la dirección de vista actual: solo cambia la distancia y el centro.
    const direction = new THREE.Vector3().subVectors(this.camera.position, this.controls!.target);
    if (direction.lengthSq() < Number.EPSILON) {
      direction.set(0, 0, 1);
    }
    direction.normalize();

    // Evita que el plano lejano recorte escenas grandes.
    this.camera.far = Math.max(this.camera.far, distance + radius * 4);
    this.camera.updateProjectionMatrix();

    const endPosition = center.clone().addScaledVector(direction, distance);
    this.animateCameraTo(endPosition, center);
  }

  private cancelCameraTween(): void {
    this.cameraTween?.stop();
    this.cameraTween = null;
  }

  private animateCameraTo(position: THREE.Vector3, target: THREE.Vector3): void {
    this.cancelCameraTween();
    const state = { t: 0 };
    const startPosition = this.camera.position.clone();
    const startTarget = this.controls!.target.clone();
    this.cameraTween = new Tween(state)
      .to({ t: 1 }, this.cameraFitDuration)
      .easing(Easing.Cubic.InOut)
      .onUpdate(() => {
        this.camera.position.lerpVectors(startPosition, position, state.t);
        this.controls!.target.lerpVectors(startTarget, target, state.t);
      })
      .onComplete(() => {
        this.cameraTween = null;
      })
      .start();
  }

  animate(): void {
    window.requestAnimationFrame(() => this.animate());
    // Acota delta para que un frame perdido no dé un salto al suavizado
    // (y evita dividir por cero en el primer frame, donde getDelta() es 0).
    const delta = Math.min(Math.max(this.clock.getDelta(), 0.001), 0.1);
    this.tween.update();
    this.cameraTween?.update();
    this.glowTween?.update();
    this.updateRays(delta);
    this.updateFollow(delta);
    this.controls!.update();
    this.interactionManager.update();
    this.renderer!.render(this.scene!, this.camera!);
    if (this.repaintAll) {
      this.doRepaintAll();
    }
  }

  public async clearScene() {
    this.interactionManager.dispose();
    this.interactionManager = new InteractionManager(
      this.renderer!,
      this.camera,
      this.renderer!.domElement
    );
    this.elements = {};
    this.scene!.remove(this.treeGroup);
    this.treeGroup = new THREE.Group();
    this.scene!.add(this.treeGroup);

  }


  public async start() {
    await this.clearScene();
    this.paintView(this.model.getNode(), this.treeGroup);
  }
  public paintView(node: TreeNode, group: THREE.Group) {
    this.paintFolder(node, group);
    if (node.visible) {
      this.paintFolderContent(node, group);
      this.paintSubFolders(node, group);
    }
  }
  public paintFolder(node: TreeNode, group: THREE.Group) {
    const myGroup: THREE.Object3D = new THREE.Group();
    myGroup.userData.type = 'folder';
    myGroup.userData.path = node.getPath();
    const folderBox = this.folderBox(node.name ? node.name : 'root');
    this.elements[myGroup.userData.path] = folderBox;
    // if folder is closed, draw a diagonal line in the upper right corner
    if (!node.visible) {

      // Crear una forma de triángulo
      const shape = new THREE.Shape();
      shape.moveTo(this.folderWidth / 2, this.folderHeight / 2);
      shape.lineTo(this.folderWidth / 2, this.folderHeight / 2 - this.closedNodeTriangleSize);
      shape.lineTo(this.folderWidth / 2 - this.closedNodeTriangleSize, this.folderHeight / 2);
      shape.lineTo(this.folderWidth / 2, this.folderHeight / 2);

      // Crear una geometría a partir de la forma
      const geometry = new THREE.ShapeGeometry(shape);

      // Crear un material
      const material = new THREE.MeshBasicMaterial({ color: 0xff0000 }); // Rojo

      // Crear un mesh y añadirlo al grupo
      const triangle = new THREE.Mesh(geometry, material);
      triangle.position.z = 0.05;
      myGroup.add(triangle);
    }
    this.interactionManager.add(folderBox);

    folderBox.addEventListener('click', (event: any) => {
      event.cancelBubble = true;
      event.stopPropagation();
      this.handleFolderClick(node, folderBox);
    });
    myGroup.add(folderBox);
    group.add(myGroup);
  }

  // three.interactive no emite 'dblclick': distinguimos clic simple y doble clic
  // con un temporizador corto. El doble clic enfoca la carpeta sin plegarla.
  private handleFolderClick(node: TreeNode, folderElement: THREE.Object3D): void {
    const pending = this.pendingFolderClick;
    if (pending && pending.object === folderElement) {
      window.clearTimeout(pending.timer);
      this.pendingFolderClick = null;
      this.focusFolder(folderElement);
      return;
    }
    if (pending) {
      // Otro clic sobre una carpeta distinta: resuelve ya el pendiente como simple.
      window.clearTimeout(pending.timer);
      this.pendingFolderClick = null;
      pending.node.visible = !pending.node.visible;
      this.onTreeNodeChange();
    }
    this.pendingFolderClick = {
      node,
      object: folderElement,
      timer: window.setTimeout(() => {
        this.pendingFolderClick = null;
        node.visible = !node.visible;
        this.onTreeNodeChange();
      }, this.doubleClickDelay),
    };
  }

  public paintFolderContent(node: TreeNode, group: THREE.Group) {
    let index = 0;
    const filesGroup = new THREE.Group();
    this.moveFirstFileDistance(filesGroup.position);
    for (const child of Object.values(node.children)) {
      if ((child as TreeNode).isFile) {
        const fileGroup = new THREE.Group();
        this.moveFileDistance(fileGroup.position, index);
        this.paintFile((child as TreeNode).name, fileGroup, (child as TreeNode).getPath());
        filesGroup.add(fileGroup);
        index++;
      }
    }
    group.add(filesGroup);
  }


  public paintFile(name: string, group: THREE.Group, path: string) {
    const myGroup = new THREE.Group();
    myGroup.userData.elementName = path;
    myGroup.userData.elementType = 'file';
    myGroup.userData.path = path;
    const fileBox = this.fileBox(name);
    this.elements[path] = fileBox;
    fileBox.addEventListener('click', (event: any) => {
      console.log(path);
      event.cancelBubble = true;
    });
    this.interactionManager.add(fileBox);
    myGroup.add(fileBox);
    group.add(myGroup);
  }

  public paintSubFolders(node: TreeNode, group: THREE.Group) {
    const subFoldersGroup = new THREE.Group();
    let lastNumOpenSubFolders = 1; //folder.open ? 1 : 0;
    for (const child of Object.values(node.children)) {
      if (!(child as TreeNode).isFile) {
        const currentSubFolderGroup = new THREE.Group();
        this.moveSiblingDistance(currentSubFolderGroup.position, lastNumOpenSubFolders);
        this.moveSonDistance(currentSubFolderGroup.position);
        this.paintView(child as TreeNode, currentSubFolderGroup);
        this.connect(subFoldersGroup, lastNumOpenSubFolders);
        subFoldersGroup.add(currentSubFolderGroup);
        lastNumOpenSubFolders += (child as TreeNode).getNumVisibleNodes();
      }
    }
    group.add(subFoldersGroup);
  }

  public connect(group: THREE.Group, numSubFolders: number) {
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
    const box = this.newBox("folder", this.folderColor, name, this.folderWidth, this.folderHeight, this.folderPanelDepth);
    return box;

  }
  public fileBox(name: string) {
    return this.newBox("file", this.fileColor, name, this.fileWidth, this.fileHeight, this.filePanelDepth);
  }

  public newBox(type: string, theColor: any, name: string = "unnamed", width: number, height: number, depth: number) {

    const geometry = new THREE.BoxGeometry(width, height, depth);
    const material = new THREE.MeshLambertMaterial({ color: theColor });
    const boxMesh = new THREE.Mesh(geometry, material)

    const boxName = new Text();
    boxName.text = name;
    boxName.fontSize = 0.1;
    boxName.color = this.getComplementaryColor(theColor);
    boxName.anchorX = 'center';
    boxName.position.set(0, 0, (depth / 2) + 0.03);
    boxName.sync();
    const boxGroup: any = new THREE.Group();
    boxGroup.add(boxMesh);
    boxGroup.add(boxName);
    boxGroup.userData.elementType = type;
    boxGroup.userData.elementName = name;
    boxGroup.userData.box = boxMesh;
    boxGroup.userData.text = boxName;
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
      this.createProgrammer(programmer);
    }
    // El astronauta que trabaja en este commit pasa a ser el objetivo. Al no
    // haber estado acumulado (velocidad/rumbo), el cambio no da saltos: el lerp
    // de la cámara y del punto de mira lo suaviza.
    this.followTarget = this.programmers[programmer];
    this.programmers[programmer].commitText.textContent = commit.commit.message;
    await this.moveProgrammerToWorkOrbit(programmer).then(() => {
      this.model.getCommitFiles(commit.sha).then(async (files: any) => {
        for (const file of files!) {
          if (file.status === 'added') {
            await this.model.addTreeNode(commit.sha, file);
            this.paintView(this.model.getNode(), this.treeGroup);
          }
          const touchObject = this.resolveTouchObject(file);
          if (touchObject) {
            const position = new THREE.Vector3();
            touchObject.getWorldPosition(position);
            const rayColors = this.rayColorsForFile(file);
            await this.moveProgrammerTo(programmer, position);
            // Al llegar: ráfaga de rayos (una por color) y pulso blanco, juntos.
            // Durante el viaje puede haber habido repaints (p. ej. alta de un
            // fichero): re-resolvemos el elemento visible para iluminar el panel
            // correcto y no una referencia ya desconectada de la escena.
            await Promise.all([
              this.launchRayVolley(programmer, position, rayColors),
              this.pulseFileGlow(this.resolveTouchObject(file))
            ]);
          }
          if (file.status === 'removed') {
            // La ráfaga y el pulso ya se han completado: ahora sí, se elimina.
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

  private createProgrammer(programmer: any) {
    const programmerGroup = new THREE.Group();
    const programmerLabel = new Text();
    programmerLabel.text = programmer;
    programmerLabel.fontSize = 0.1;
    programmerLabel.color = 0xff0066;
    programmerLabel.anchorX = 'center';
    programmerLabel.position.y = 0.1;
    programmerLabel.sync();
    programmerGroup.add(programmerLabel);

    const commitLabel = new Text();
    commitLabel.text = "";
    commitLabel.fontSize = 0.1;
    commitLabel.color = 0xff0066;
    commitLabel.anchorX = 'center';
    commitLabel.position.y = -0.3;
    commitLabel.sync();
    programmerGroup.add(commitLabel);

    const astronaut = this.astronaut.clone();
    programmerGroup.add(astronaut);

    this.programmers[programmer] = {
      programmerText: programmerLabel,
      commitText: commitLabel,
      astronaut: astronaut,
      group: programmerGroup
    };
    this.scene.add(programmerGroup);
  }

  public moveProgrammerToWaitOrbit(programmer: string): Promise<void> {
    return new Promise((resolve) => {
      const startPosition = this.programmers[programmer].group.position.clone();
      const endPosition = this.programmers[programmer].group.position.clone();
      endPosition.z = 2;
      this.tween = new Tween(startPosition)
        .to(endPosition, 1000)
        .easing(Easing.Cubic.InOut)
        .onUpdate(() => {
          this.programmers[programmer].group.position.set(startPosition.x, startPosition.y, startPosition.z);
        })
        .onComplete(() => {
          resolve();
        })
        .start();
    });
  }
  public moveProgrammerToWorkOrbit(programmer: string): Promise<void> {
    return new Promise((resolve) => {
      const startPosition = this.programmers[programmer].group.position.clone();
      const endPosition = this.programmers[programmer].group.position.clone();
      endPosition.z = 1;
      this.tween = new Tween(startPosition)
        .to(endPosition, 200)
        .onUpdate(() => {
          this.programmers[programmer].group.position.set(startPosition.x, startPosition.y, startPosition.z);
        })
        .onComplete(() => {
          // this.programmers[programmer].lightSphere.material.color.set(0xff00ff);
          resolve();
        })
        .start();
    });
  }

  async moveProgrammerTo(programmer: string, targetPosition: THREE.Vector3) {
    const startPosition = this.programmers[programmer].group.position.clone();
    const endPosition = new THREE.Vector3(targetPosition.x, targetPosition.y - 0.5, targetPosition.z + 2);
    await new Promise<void>(resolve => {
      this.tween = new Tween(startPosition)
        .to(endPosition, 1000)
        .easing(Easing.Cubic.InOut)
        .onUpdate(() => {
          this.programmers[programmer].group.position.set(startPosition.x, startPosition.y, 1);
        })
        .onComplete(() => {
          resolve();
        })
        .start();
    });
  }

  // Colores aplicables a un fichero: amarillo si hubo modificaciones, verde si
  // se agregó código y rojo si se borró. Fallback amarillo si no hay señal.
  private rayColorsForFile(file: any): number[] {
    const colors: number[] = [];
    if (file.status === 'modified') {
      colors.push(this.rayColorNeutral);
    }
    if (file.additions > 0) {
      colors.push(this.rayColorAdded);
    }
    if (file.deletions > 0) {
      colors.push(this.rayColorRemoved);
    }
    if (colors.length === 0) {
      colors.push(this.rayColorNeutral);
    }
    return colors;
  }

  // Ráfaga: un rayo por color en sucesión rápida. Resuelve cuando muere el último.
  private launchRayVolley(programmer: string, targetPosition: THREE.Vector3, colors: number[]): Promise<void> {
    return new Promise((resolve) => {
      colors.forEach((color, index) => {
        window.setTimeout(() => {
          this.spawnRay(programmer, targetPosition, color);
          if (index === colors.length - 1) {
            window.setTimeout(resolve, this.rayLife * 1000);
          }
        }, index * this.rayStaggerMs);
      });
    });
  }

  // Rayo de verdad: cilindro fino orientado con cuaternión, no una línea de 1 px.
  private spawnRay(programmer: string, targetPosition: THREE.Vector3, color: number): void {
    const origin = this.programmers[programmer].group.position;
    const fromY = origin.y + this.rayOriginOffset;
    const dx = targetPosition.x - origin.x;
    const dy = targetPosition.y - fromY;
    const dz = targetPosition.z - origin.z;
    const length = Math.hypot(dx, dy, dz);
    if (length < 1e-4) {
      return;
    }
    const direction = new THREE.Vector3(dx / length, dy / length, dz / length);
    const geometry = new THREE.CylinderGeometry(this.rayRadius, this.rayRadius, length, 6, 1, true);
    const material = new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: this.rayFadeOpacity,
      depthWrite: false
    });
    const beam = new THREE.Mesh(geometry, material);
    beam.position.set(
      origin.x + direction.x * length / 2,
      fromY + direction.y * length / 2,
      origin.z + direction.z * length / 2
    );
    beam.quaternion.setFromUnitVectors(this.rayUp, direction);
    this.scene.add(beam);
    this.activeRays.push({ mesh: beam, elapsed: 0, life: this.rayLife });
  }

  // Desvanecido y limpieza de los rayos activos (sin residuos en escena).
  private updateRays(delta: number): void {
    for (let i = this.activeRays.length - 1; i >= 0; i--) {
      const ray = this.activeRays[i];
      ray.elapsed += delta;
      const progress = Math.min(ray.elapsed / ray.life, 1);
      ray.mesh.material.opacity = this.rayFadeOpacity * (1 - progress);
      if (progress >= 1) {
        this.scene.remove(ray.mesh);
        ray.mesh.geometry.dispose();
        ray.mesh.material.dispose();
        this.activeRays.splice(i, 1);
      }
    }
  }

  // Re-resuelve el elemento visible en el momento del toque: el panel del fichero
  // si está a la vista, o el del primer ancestro visible si su carpeta está
  // plegada (que es su representación en pantalla).
  private resolveTouchObject(file: any): THREE.Object3D | undefined {
    const firstVisibleParent = this.model.findFirstVisibleParent(file.filename);
    if (!firstVisibleParent) {
      return undefined;
    }
    const parent = this.model.find(file.filename)?.parent;
    if (parent && parent === firstVisibleParent) {
      // El padre (carpeta) está plegado: el fichero no se dibuja, así que
      // señalamos el panel de esa carpeta como su representación visible.
      return this.elements[firstVisibleParent.getPath()];
    }
    // El fichero está dibujado (findFirstVisibleParent devuelve el propio nodo
    // cuando el camino está visible).
    return this.elements[file.filename] ?? this.elements[firstVisibleParent.getPath()];
  }

  // Nunca devuelve un grupo sin geometría: el mesh del panel (userData.box) o,
  // como respaldo, el primer mesh real del subárbol.
  private getPanelMesh(object: THREE.Object3D | undefined): THREE.Mesh | null {
    if (!object) {
      return null;
    }
    const box: unknown = object.userData.box;
    if (box instanceof THREE.Mesh) {
      return box;
    }
    const meshes: THREE.Mesh[] = [];
    object.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        meshes.push(child);
      }
    });
    return meshes[0] ?? null;
  }

  // Pulso blanco sutil (emissive) sobre el panel tocado. La curva sin(π·t) empieza
  // y acaba en el color base, así que el material queda restaurado exactamente al
  // terminar (o si otro pulso lo interrumpe).
  private pulseFileGlow(object: THREE.Object3D | undefined): Promise<void> {
    const mesh = this.getPanelMesh(object);
    const material = mesh?.material;
    if (!(material instanceof THREE.MeshLambertMaterial)) {
      return Promise.resolve();
    }
    this.stopFileGlow();
    this.glowMaterial = material;
    this.glowBaseEmissive.copy(material.emissive);
    const state = { t: 0 };
    const target = new THREE.Color(this.glowColorWhite);
    return new Promise<void>((resolve) => {
      this.glowTween = new Tween(state)
        .to({ t: 1 }, this.glowDuration)
        .onUpdate(() => {
          material.emissive
            .copy(this.glowBaseEmissive)
            .lerp(target, this.glowIntensity * Math.sin(Math.PI * state.t));
        })
        .onComplete(() => {
          material.emissive.copy(this.glowBaseEmissive);
          this.glowTween = null;
          this.glowMaterial = null;
          resolve();
        })
        .start();
    });
  }

  private stopFileGlow(): void {
    if (this.glowTween) {
      this.glowTween.stop();
      this.glowTween = null;
    }
    if (this.glowMaterial) {
      this.glowMaterial.emissive.copy(this.glowBaseEmissive);
      this.glowMaterial = null;
    }
  }
}
