import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import Stats from 'three/examples/jsm/libs/stats.module';
import { Font, FontLoader } from 'three/examples/jsm/loaders/FontLoader';

export default class SceneInit {
  private fov: number;
  private nearPlane: number;
  private farPlane: number;
  private canvasId: string;
  private clock: THREE.Clock | undefined;
  private stats: Stats | undefined;
  private controls: OrbitControls | undefined;
  private ambientLight: THREE.AmbientLight | undefined;
  private directionalLight: THREE.DirectionalLight | undefined;
  public scene: THREE.Scene | undefined;
  public camera: THREE.PerspectiveCamera | undefined;
  public renderer: THREE.WebGLRenderer | undefined;
  public font:   Font | undefined;
  constructor(canvasId: string) {
    this.fov = 45;
    this.nearPlane = 1;
    this.farPlane = 1000;
    this.canvasId = canvasId;
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
    const loader = new   FontLoader();
    try {
      this.font = await new Promise((resolve, reject) => {
        loader.load(
          'node_modules/three/examples/fonts/droid/droid_serif_regular.typeface.json',
          resolve,
          undefined,
          reject
        );
      });
    } catch (error) {
      console.error('Error loading font:', error);
    }
    const canvas = document.getElementById(this.canvasId);
    if (canvas instanceof HTMLCanvasElement) {
      this.renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
      });
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      document.body.appendChild(this.renderer.domElement);

      this.clock = new THREE.Clock();
      this.controls = new OrbitControls(this.camera, this.renderer.domElement);
      this.stats = new Stats();
      document.body.appendChild(this.stats.dom);

      this.ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
      this.scene.add(this.ambientLight);

      this.directionalLight = new THREE.DirectionalLight(0xffffff, 1);
      this.directionalLight.position.set(0, 32, 64);
      this.scene.add(this.directionalLight);

      window.addEventListener('resize', () => this.onWindowResize(), false);
    }
  }

  animate(): void {
    if (this.renderer && this.camera && this.stats && this.controls) {
      window.requestAnimationFrame(() => this.animate());
      this.renderer.render(this.scene!, this.camera);
      this.stats.update();
      this.controls.update();
    }
  }

  onWindowResize(): void {
    if (this.camera && this.renderer) {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
  }
}