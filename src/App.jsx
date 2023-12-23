import { useEffect } from 'react';
// import { FontLoader } from 'three';
import * as THREE from 'three';

import { FontLoader } from 'three/examples/jsm/loaders/FontLoader';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry';

import SceneInit from './lib/SceneInit';

// Leer la estructura del directorio y sus archivos
// Esto es solo un ejemplo, necesitarás implementar tu propia lógica para leer la estructura del directorio



// Función para crear una superficie para un directorio
function createDirectorySurface(scene, directory, level) {
  const loader = new FontLoader();
  loader.load(
      'node_modules/three/examples/fonts/droid/droid_serif_regular.typeface.json',
      (font) => {
    // Crear cubos para los archivos
    directory.files.forEach((file, index) => {
      const fileGeometry = new THREE.BoxGeometry(0.1, 0.1, 0.1);
      const fileMaterial = new THREE.MeshBasicMaterial({color: 0x00ff00});
      const cube = new THREE.Mesh(fileGeometry, fileMaterial);
      cube.position.set(index / 10, level, 0);
      scene.add(cube);

      // Crear geometría de texto para el nombre del archivo
      const textGeometry = new TextGeometry(file, {
        font: font,
        size: 0.1,
        height: 0.01,
      });
      const textMaterial = new THREE.MeshBasicMaterial({color: 0xffffff});
      const text = new THREE.Mesh(textGeometry, textMaterial);
      text.position.set(index / 10, level, 0.2);
      scene.add(text);
    });
  });
  const geometry = new THREE.PlaneGeometry(1, 1);
  const material = new THREE.MeshBasicMaterial({ color: 0xffff00, side: THREE.DoubleSide });
  const plane = new THREE.Mesh(geometry, material);
  plane.position.y = level;
  scene.add(plane);
// console.log("files:"+ directory.name);
  // Crear cubos para los archivos
  directory.files.forEach((file, index) => {
    const fileGeometry = new THREE.BoxGeometry(0.1, 0.1, 0.1);
    const fileMaterial = new THREE.MeshBasicMaterial({color: 0x00ff00});
    const cube = new THREE.Mesh(fileGeometry, fileMaterial);
    cube.position.set(index / 10, level, 0);
    scene.add(cube);
    //createCubeWithText(scene, index/10, index/10 , file);
  });
  directory.subdirectories.forEach((subdirectory, index) => {
    createDirectorySurface(scene, subdirectory, index + 1);
  });


  // Crear superficies para los subdirectorios
}


function createCubeWithText(scene, size, position, text) {
  const geometry = new THREE.BoxGeometry(size * 5, size, 1);
  const material = new THREE.MeshBasicMaterial({ color: 0x0000FF });
  const cube = new THREE.Mesh(geometry, material);
  cube.position.set(position, position, position);
  // scene.add(cube);

  const loader = new FontLoader();
  loader.load(
    'node_modules/three/examples/fonts/droid/droid_serif_regular.typeface.json',
    (droidFont) => {
      const textGeometry = new TextGeometry(text, {
        size: size ,
        height: 1,
        font: droidFont,
      });

      const textMaterial = new THREE.MeshBasicMaterial({ color: 0xFF0000 });
      const textMesh = new THREE.Mesh(textGeometry, textMaterial);
      textMesh.position.set(position - ((size * 5) / 2), position - ((size / 4)), position+4);
      scene.add(textMesh); 
    });
}


function App() {

  useEffect(() => {
    const test = new SceneInit('myThreeJsCanvas');
    test.initialize();
    test.animate();
    // Crear la superficie para el directorio raíz

    // createCubeWithText(test.scene, 10, {x: 0, y: 0, z: 0}, 'Hello, world!');
    const folders = [{
      name: 'root',
      files: ['file1', 'file2'],
      subdirectories: [
        {
          name: 'sub1',
          files: ['file3', 'file4'],
          subdirectories: [
            {
              name: 'sub2',
              files: ['file5', 'file6'],
              subdirectories: [
                {
                  name: 'sub3',
                  files: ['file7',],
                  subdirectories: []
                }
              ]
            }
          ]
        }
      ]
    }];
    createDirectorySurface(test.scene, folders[0], 0);
    // createCubeWithText(test.scene, 10, {x: 10, y: 10, z: -10}, 'Hi!');
  }, []);
 

  return (
    <div>
      <canvas id="myThreeJsCanvas" />
    </div>
  );
}

export default App;
// --------------------------------------------------------------------------

// // Crear una escena 3D
// const scene = new THREE.Scene();
// const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
// const renderer = new THREE.WebGLRenderer();
// renderer.setSize(window.innerWidth, window.innerHeight);
// document.body.appendChild(renderer.domElement);

// // Crear controles para la cámara
// const controls = new OrbitControls(camera, renderer.domElement);
// // Leer la estructura del directorio y sus archivos
// // Esto es solo un ejemplo, necesitarás implementar tu propia lógica para leer la estructura del directorio
// const folders = {
//   name: 'root',
//   files: ['file1', 'file2'],
//   subdirectories: [
//     {
//       name: 'sub1',
//       files: ['file3', 'file4'],
//       subdirectories: []
//     }
//   ]
// };


// // Función para crear una superficie para un directorio
// function createDirectorySurface(directory: { name?: string; files: any; subdirectories: any; }, level: number) {
//   const geometry = new THREE.PlaneGeometry(1, 1);
//   const material = new THREE.MeshBasicMaterial({color: 0xffff00, side: THREE.DoubleSide});
//   const plane = new THREE.Mesh(geometry, material);
//   plane.position.y = level;
//   scene.add(plane);

//   // Crear cubos para los archivos
//   directory.files.forEach((file: any, index: number) => {
//     const fileGeometry = new THREE.BoxGeometry(0.1, 0.1, 0.1);
//     const fileMaterial = new THREE.MeshBasicMaterial({color: 0x00ff00});
//     const cube = new THREE.Mesh(fileGeometry, fileMaterial);
//     cube.position.set(index / 10, level, 0);
//     scene.add(cube);
//   });

//   // Crear superficies para los subdirectorios
//   directory.subdirectories.forEach((subdirectory: { name?: string | undefined; files: any; subdirectories: any; }, index: any) => {
//     createDirectorySurface(subdirectory, level + 1);
//   });
// }

// // Crear la superficie para el directorio raíz
// createDirectorySurface(folders, 0);

// // Posicionar la cámara
// camera.position.z = 5;

// // Función de animación
// function animate() {
//   requestAnimationFrame(animate);
//   renderer.render(scene, camera);
// }

// // Iniciar la animación
// animate();





