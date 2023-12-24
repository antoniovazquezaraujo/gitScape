import { useEffect } from 'react';
import * as THREE from 'three';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry';
import SceneInit from './lib/SceneInit';
import React from 'react';


interface Directory {
  name: string;
  files: string[];
  subdirectories: Directory[];
}

// function createDirectorySurface(scene: THREE.Scene, directory: Directory, level: number): void {
//   const loader = new FontLoader();
//   loader.load(
//     'node_modules/three/examples/fonts/droid/droid_serif_regular.typeface.json',
//     (font) => {
//       directory.files.forEach((file, index) => {
//         const fileGeometry = new THREE.BoxGeometry(0.1, 0.1, 0.1);
//         const fileMaterial = new THREE.MeshBasicMaterial({color: 0x00ff00});
//         const cube = new THREE.Mesh(fileGeometry, fileMaterial);
//         cube.position.set(index / 10, level, 0);
//         scene.add(cube);

//         const textGeometry = new TextGeometry(file, {
//           font: font,
//           size: 0.1,
//           height: 0.01,
//         });
//         const textMaterial = new THREE.MeshBasicMaterial({color: 0xffffff});
//         const text = new THREE.Mesh(textGeometry, textMaterial);
//         text.position.set(index / 10, level, 0.2);
//         scene.add(text);
//       });

//       const geometry = new THREE.PlaneGeometry(1, 1);
//       const material = new THREE.MeshBasicMaterial({ color: 0xffff00, side: THREE.DoubleSide });
//       const plane = new THREE.Mesh(geometry, material);
//       plane.position.y = level;
//       scene.add(plane);

//       directory.subdirectories.forEach((subdirectory, index) => {
//         createDirectorySurface(scene, subdirectory, index + 1);
//       });
//     }
//   );
// }
// function oldcreateDirectoryView(scene: THREE.Scene, directory: Directory, level: number, xPosition:number): void {
//   const loader = new FontLoader();
//   loader.load(
//     'node_modules/three/examples/fonts/droid/droid_serif_regular.typeface.json',
//     (font) => {
//       // Create a cube for the directory
//       const dirGeometry = new THREE.BoxGeometry(1, 1, 1);
//       const dirMaterial = new THREE.MeshBasicMaterial({color: 0xff0000});
//       const dirCube = new THREE.Mesh(dirGeometry, dirMaterial);
//       dirCube.position.set(xPosition, 0,level*1.4);
//       scene.add(dirCube);

//       // Create a cube for each file in the directory
//       var verticalPosition = 1;
//       directory.files.forEach((file, index) => {
//         const fileGeometry = new THREE.BoxGeometry(1, 0.5, 0.1);
//         const fileMaterial = new THREE.MeshBasicMaterial({color: 0x00ff00});
//         const fileCube = new THREE.Mesh(fileGeometry, fileMaterial);
//         fileCube.position.set(xPosition + index / 10, verticalPosition, level*1.4);
//         scene.add(fileCube);

//         const textGeometry = new TextGeometry(file, {
//           font: font,
//           size: 0.1,
//           height: 0.01,
//         });
//         const textMaterial = new THREE.MeshBasicMaterial({color: 0xff00ff});
//         const text = new THREE.Mesh(textGeometry, textMaterial);
//         text.position.set(xPosition+ index/10 , verticalPosition, level*1.4+0.2);
//         scene.add(text);
//         verticalPosition += 0.5;
//       });

//       // Create a line to each subdirectory
//       var directoryPosition = xPosition ;
//       directory.subdirectories.forEach((subdirectory, index) => {
//         const lineMaterial = new THREE.LineBasicMaterial({color: 0xffffff});
//         const points = [];
//         points.push(
//           new THREE.Vector3(0, level, 1), // start at the back of the directory cube
//           new THREE.Vector3(index * 2, level + 1, -1) // end at the front of the subdirectory cube
//         );

//         const lineGeometry = new THREE.BufferGeometry().setFromPoints(points);
//         const line = new THREE.Line(lineGeometry, lineMaterial);
//         // scene.add(line);
//         oldcreateDirectoryView(scene, subdirectory, level - 1, directoryPosition);
//         directoryPosition += 2;
//       });
//     }
//   );
// }


// function createDirectoryView(scene: THREE.Scene, directory: Directory, level: number): void {
//   const loader = new FontLoader();
//   loader.load(
//     'node_modules/three/examples/fonts/droid/droid_serif_regular.typeface.json',
//     (font) => {
//       // Create a cube for the directory
//       const dirGeometry = new THREE.BoxGeometry(1, 1, 1);
//       const dirMaterial = new THREE.MeshBasicMaterial({color: 0xffff00});
//       const dirCube = new THREE.Mesh(dirGeometry, dirMaterial);
//       dirCube.position.set(0, level, 0);
//       // scene.add(dirCube);

//       // Add directory name to the cube
//       const dirTextGeometry = new TextGeometry(directory.name, {
//         font: font,
//         size: 0.1,
//         height: 0.01,
//       });
//       const dirTextMaterial = new THREE.MeshBasicMaterial({color: 0x0000ff});
//       const dirText = new THREE.Mesh(dirTextGeometry, dirTextMaterial);
//       dirText.position.set(0, level, 0.5);
//       scene.add(dirText);

//       // Create a cube for each file in the directory
//       directory.files.forEach((file, index) => {
//         const fileGeometry = new THREE.BoxGeometry(0.1, 0.1, 0.1);
//         const fileMaterial = new THREE.MeshBasicMaterial({color: 0x00ff00});
//         const fileCube = new THREE.Mesh(fileGeometry, fileMaterial);
//         fileCube.position.set(0, level + index / 10 + 1, 0);
//         scene.add(fileCube);

//         const textGeometry = new TextGeometry(file, {
//           font: font,
//           size: 0.1,
//           height: 0.01,
//         });
//         const textMaterial = new THREE.MeshBasicMaterial({color: 0xffffff});
//         const text = new THREE.Mesh(textGeometry, textMaterial);
//         text.position.set(0, level + index / 10 + 1, 0.2);
//         scene.add(text);
//       });

//       // Create a line to each subdirectory
//       directory.subdirectories.forEach((subdirectory, index) => {
//         const points = [];
//         points.push(new THREE.Vector3(0, level, 1)); // start at the back of the directory cube
//         points.push(new THREE.Vector3(index * 2, level + 1, -1)); // end at the front of the subdirectory cube

//         const lineGeometry = new THREE.BufferGeometry().setFromPoints(points);
//         const lineMaterial = new THREE.LineBasicMaterial({color: 0x0000ff});
//         const line = new THREE.Line(lineGeometry, lineMaterial);
//           scene.add(line);

//         createDirectoryView(scene, subdirectory, level + 1);
//       });
//     }
//   );
// }
// function createDirectoryView(scene: THREE.Scene, directory: Directory, level: number, xPosition: number): void {
//   const loader = new FontLoader();
//   loader.load(
//     'node_modules/three/examples/fonts/droid/droid_serif_regular.typeface.json',
//     (font) => {
//       // Create a cube for the directory
//       const dirGeometry = new THREE.BoxGeometry(1, 1, 1);
//       const dirMaterial = new THREE.MeshBasicMaterial({color: 0x0fff00});
//       const dirCube = new THREE.Mesh(dirGeometry, dirMaterial);
//       dirCube.position.set(xPosition, level, 0);
//       scene.add(dirCube);

//       // Add directory name to the cube
//       const dirTextGeometry = new TextGeometry(directory.name, {
//         font: font,
//         size: 0.1,
//         height: 0.01,
//       });
//       const dirTextMaterial = new THREE.MeshBasicMaterial({color: 0xffffff});
//       const dirText = new THREE.Mesh(dirTextGeometry, dirTextMaterial);
//       dirText.position.set(xPosition, level, 0.5);
//       scene.add(dirText);

//       // Create a line going down from the directory
//       const pointsDown = [];
//       pointsDown.push(new THREE.Vector3(xPosition, level, 0)); // start at the bottom of the directory cube
//       pointsDown.push(new THREE.Vector3(xPosition, level - 1, 0)); // end one level below

//       const lineGeometryDown = new THREE.BufferGeometry().setFromPoints(pointsDown);
//       const lineMaterialDown = new THREE.LineBasicMaterial({color: 0x0000ff});
//       const lineDown = new THREE.Line(lineGeometryDown, lineMaterialDown);
//       scene.add(lineDown);

//       // Create a line to each subdirectory
//       directory.subdirectories.forEach((subdirectory, index) => {
//         const pointsRight = [];
//         pointsRight.push(new THREE.Vector3(xPosition, level - 1, 0)); // start at the end of the vertical line
//         pointsRight.push(new THREE.Vector3(xPosition + index + 1, level - 1, 0)); // end at the left of the subdirectory cube

//         const lineGeometryRight = new THREE.BufferGeometry().setFromPoints(pointsRight);
//         const lineMaterialRight = new THREE.LineBasicMaterial({color: 0x0000ff});
//         const lineRight = new THREE.Line(lineGeometryRight, lineMaterialRight);
//         scene.add(lineRight);

//         createDirectoryView(scene, subdirectory, level - 1, xPosition + index + 1);
//       });
//     }
//   );
// }
// function createDirectoryView(scene: THREE.Scene, directory: Directory, level: number, xPosition: number): void {
//   const loader = new FontLoader();
//   loader.load(
//     'node_modules/three/examples/fonts/droid/droid_serif_regular.typeface.json',
//     (font) => {
//       // Create a cube for the directory
//       const dirGeometry = new THREE.BoxGeometry(1, 1, 1);
//       const dirMaterial = new THREE.MeshBasicMaterial({color: 0x0fff00});
//       const dirCube = new THREE.Mesh(dirGeometry, dirMaterial);
//       dirCube.position.set(xPosition, level, 0);
//       scene.add(dirCube);

//       // Add directory name to the cube
//       const dirTextGeometry = new TextGeometry(directory.name, {
//         font: font,
//         size: 0.1,
//         height: 0.01,
//       });
//       const dirTextMaterial = new THREE.MeshBasicMaterial({color: 0xffffff});
//       const dirText = new THREE.Mesh(dirTextGeometry, dirTextMaterial);
//       dirText.position.set(xPosition, level, 0.5);
//       scene.add(dirText);

//       // Create a line to each subdirectory
//       directory.subdirectories.forEach((subdirectory, index) => {
//         // Create a line going down from the directory
//         const pointsDown = [];
//         pointsDown.push(new THREE.Vector3(xPosition, level - index, 0)); // start at the bottom of the directory cube
//         pointsDown.push(new THREE.Vector3(xPosition, level - index - 1, 0)); // end one level below

//         const lineGeometryDown = new THREE.BufferGeometry().setFromPoints(pointsDown);
//         const lineMaterialDown = new THREE.LineBasicMaterial({color: 0x0000ff});
//         const lineDown = new THREE.Line(lineGeometryDown, lineMaterialDown);
//         scene.add(lineDown);

//         // Create a line going right from the end of the vertical line
//         const pointsRight = [];
//         pointsRight.push(new THREE.Vector3(xPosition, level - index - 1, 0)); // start at the end of the vertical line
//         pointsRight.push(new THREE.Vector3(xPosition + 1, level - index - 1, 0)); // end at the left of the subdirectory cube

//         const lineGeometryRight = new THREE.BufferGeometry().setFromPoints(pointsRight);
//         const lineMaterialRight = new THREE.LineBasicMaterial({color: 0x0000ff});
//         const lineRight = new THREE.Line(lineGeometryRight, lineMaterialRight);
//         scene.add(lineRight);

//         createDirectoryView(scene, subdirectory, level - index - 1, xPosition + 1);
//       });
//     }
//   );
// }
// function createDirectoryView(scene: THREE.Scene, directory: Directory, level: number, xPosition: number): number {
//   let subLevel = level;
//   const loader = new FontLoader();
//   loader.load(
//     'node_modules/three/examples/fonts/droid/droid_serif_regular.typeface.json',
//     (font) => {
//       // Create a cube for the directory
//       const dirGeometry = new THREE.BoxGeometry(1, 1, 1);
//       const dirMaterial = new THREE.MeshBasicMaterial({color: 0x0fff00});
//       const dirCube = new THREE.Mesh(dirGeometry, dirMaterial);
//       dirCube.position.set(xPosition, subLevel, 0);
//       scene.add(dirCube);

//       // Add directory name to the cube
//       const dirTextGeometry = new TextGeometry(directory.name, {
//         font: font,
//         size: 0.1,
//         height: 0.01,
//       });
//       const dirTextMaterial = new THREE.MeshBasicMaterial({color: 0xffffff});
//       const dirText = new THREE.Mesh(dirTextGeometry, dirTextMaterial);
//       dirText.position.set(xPosition, subLevel, 0.5);
//       scene.add(dirText);

//       // Create a line to each subdirectory
//       directory.subdirectories.forEach((subdirectory) => {
//         // Create a line going down from the directory
//         const pointsDown = [];
//         pointsDown.push(new THREE.Vector3(xPosition, subLevel, 0)); // start at the bottom of the directory cube
//         pointsDown.push(new THREE.Vector3(xPosition, subLevel - 1, 0)); // end one level below

//         const lineGeometryDown = new THREE.BufferGeometry().setFromPoints(pointsDown);
//         const lineMaterialDown = new THREE.LineBasicMaterial({color: 0x0000ff});
//         const lineDown = new THREE.Line(lineGeometryDown, lineMaterialDown);
//         scene.add(lineDown);

//         // Create a line going right from the end of the vertical line
//         const pointsRight = [];
//         pointsRight.push(new THREE.Vector3(xPosition, subLevel - 1, 0)); // start at the end of the vertical line
//         pointsRight.push(new THREE.Vector3(xPosition + 1, subLevel - 1, 0)); // end at the left of the subdirectory cube

//         const lineGeometryRight = new THREE.BufferGeometry().setFromPoints(pointsRight);
//         const lineMaterialRight = new THREE.LineBasicMaterial({color: 0x0000ff});
//         const lineRight = new THREE.Line(lineGeometryRight, lineMaterialRight);
//         scene.add(lineRight);

//         subLevel = createDirectoryView(scene, subdirectory, subLevel - 1, xPosition + 1);
//       });
//     }
//   );
//   return subLevel - 1;
// }

// function createDirectoryView(scene: THREE.Scene, directory: Directory, level: number, xPosition: number): number {
//   let subLevel = level;
//   const loader = new FontLoader();
//   loader.load(
//     'node_modules/three/examples/fonts/droid/droid_serif_regular.typeface.json',
//     (font) => {
//       // Create a cube for the directory
//       const dirGeometry = new THREE.BoxGeometry(1, 1, 1);
//       const dirMaterial = new THREE.MeshBasicMaterial({color: 0x0fff00});
//       const dirCube = new THREE.Mesh(dirGeometry, dirMaterial);
//       dirCube.position.set(xPosition, subLevel, 0);
//       scene.add(dirCube);

//       // Add directory name to the cube
//       const dirTextGeometry = new TextGeometry(directory.name, {
//         font: font,
//         size: 0.1,
//         height: 0.01,
//       });
//       const dirTextMaterial = new THREE.MeshBasicMaterial({color: 0xffffff});
//       const dirText = new THREE.Mesh(dirTextGeometry, dirTextMaterial);
//       dirText.position.set(xPosition, subLevel, 0.5);
//       scene.add(dirText);

//       // Create a line to each subdirectory
//       directory.subdirectories.forEach((subdirectory) => {
//         // Create a line going down from the directory
//         const pointsDown = [];
//         pointsDown.push(new THREE.Vector3(xPosition, subLevel, 0)); // start at the bottom of the directory cube
//         pointsDown.push(new THREE.Vector3(xPosition, subLevel - 1, 0)); // end one level below

//         const lineGeometryDown = new THREE.BufferGeometry().setFromPoints(pointsDown);
//         const lineMaterialDown = new THREE.LineBasicMaterial({color: 0x0000ff});
//         const lineDown = new THREE.Line(lineGeometryDown, lineMaterialDown);
//         scene.add(lineDown);

//         // Create a line going right from the end of the vertical line
//         const pointsRight = [];
//         pointsRight.push(new THREE.Vector3(xPosition, subLevel - 1, 0)); // start at the end of the vertical line
//         pointsRight.push(new THREE.Vector3(xPosition + 1, subLevel - 1, 0)); // end at the left of the subdirectory cube

//         const lineGeometryRight = new THREE.BufferGeometry().setFromPoints(pointsRight);
//         const lineMaterialRight = new THREE.LineBasicMaterial({color: 0x0000ff});
//         const lineRight = new THREE.Line(lineGeometryRight, lineMaterialRight);
//         scene.add(lineRight);

//         // Recursively create subdirectories and update the subLevel
//         subLevel = createDirectoryView(scene, subdirectory, subLevel - 1 - subdirectory.subdirectories.length, xPosition + 1);
//       });
//     }
//   );
//   return subLevel - 1;
// }

// esta está bien, pero las lineas están algo separadas y las verticales se cortan
// function createDirectoryView(scene: THREE.Scene, directory: Directory, level: number, xPosition: number): number {
//   let subLevel = level;
//   const loader = new FontLoader();
//   loader.load(
//     'node_modules/three/examples/fonts/droid/droid_serif_regular.typeface.json',
//     (font) => {
//       // Create a cube for the directory
//       const dirGeometry = new THREE.BoxGeometry(1, 1, 1);
//       const dirMaterial = new THREE.MeshBasicMaterial({color: 0x0fff00});
//       const dirCube = new THREE.Mesh(dirGeometry, dirMaterial);
//       dirCube.position.set(xPosition, subLevel, 0);
//       scene.add(dirCube);

//       // Add directory name to the cube
//       const dirTextGeometry = new TextGeometry(directory.name, {
//         font: font,
//         size: 0.1,
//         height: 0.01,
//       });
//       const dirTextMaterial = new THREE.MeshBasicMaterial({color: 0xffffff});
//       const dirText = new THREE.Mesh(dirTextGeometry, dirTextMaterial);
//       dirText.position.set(xPosition, subLevel, 0.5);
//       scene.add(dirText);

//       // Create a line to each subdirectory
//       directory.subdirectories.forEach((subdirectory, index) => {
//         // Create a line going down from the directory
//         const pointsDown = [];
//         pointsDown.push(new THREE.Vector3(xPosition, subLevel, 0)); // start at the bottom of the directory cube
//         pointsDown.push(new THREE.Vector3(xPosition, subLevel - index - 1, 0)); // end one level below for each subdirectory

//         const lineGeometryDown = new THREE.BufferGeometry().setFromPoints(pointsDown);
//         const lineMaterialDown = new THREE.LineBasicMaterial({color: 0x0000ff});
//         const lineDown = new THREE.Line(lineGeometryDown, lineMaterialDown);
//         scene.add(lineDown);

//         // Create a line going right from the end of the vertical line
//         const pointsRight = [];
//         pointsRight.push(new THREE.Vector3(xPosition, subLevel - index - 1, 0)); // start at the end of the vertical line
//         pointsRight.push(new THREE.Vector3(xPosition + 1, subLevel - index - 1, 0)); // end at the left of the subdirectory cube

//         const lineGeometryRight = new THREE.BufferGeometry().setFromPoints(pointsRight);
//         const lineMaterialRight = new THREE.LineBasicMaterial({color: 0x0000ff});
//         const lineRight = new THREE.Line(lineGeometryRight, lineMaterialRight);
//         scene.add(lineRight);

//         // Recursively create subdirectories and update the subLevel
//         subLevel = createDirectoryView(scene, subdirectory, subLevel - index - 1, xPosition + 2);
//       });
//     }
//   );
//   return subLevel - directory.subdirectories.length;
// }
// falta quitar la separación vertical de las lineas
// function createDirectoryView(scene: THREE.Scene, directory: any, subLevel: number, xPosition: number) {
//   // Create a cube for the directory
//   const geometry = new THREE.BoxGeometry(1, 1, 1);
//   const material = new THREE.MeshBasicMaterial({color: 0x00ff00});
//   const cube = new THREE.Mesh(geometry, material);
//   cube.position.set(xPosition, subLevel, 0);
//   scene.add(cube);

//   // For each subdirectory, create a line going left from the subdirectory to the vertical line
//   directory.subdirectories.forEach((subdirectory:any, index:any) => {
//     // const pointsLeft = [];
//     // pointsLeft.push(new THREE.Vector3(xPosition + 2, subLevel - index - 1, 0)); // start at the subdirectory cube
//     // pointsLeft.push(new THREE.Vector3(xPosition, subLevel - index - 1, 0)); // end at the vertical line

//     // const lineGeometryLeft = new THREE.BufferGeometry().setFromPoints(pointsLeft);
//     // const lineMaterialLeft = new THREE.LineBasicMaterial({color: 0x0000ff});
//     // const lineLeft = new THREE.Line(lineGeometryLeft, lineMaterialLeft);
//     // scene.add(lineLeft);

//     // // If it's the last subdirectory, create a line going up from the subdirectory to the directory
//     // if (index === directory.subdirectories.length - 1) {
//     //   const pointsUp = [];
//     //   pointsUp.push(new THREE.Vector3(xPosition, subLevel - index - 1, 0)); // start at the subdirectory level
//     //   const parentLevel = subLevel+1;
//     //   pointsUp.push(new THREE.Vector3(xPosition, parentLevel, 0)); // end at the parent directory level

//     //   const lineGeometryUp = new THREE.BufferGeometry().setFromPoints(pointsUp);
//     //   const lineMaterialUp = new THREE.LineBasicMaterial({color: 0x0000ff});
//     //   const lineUp = new THREE.Line(lineGeometryUp, lineMaterialUp);
//     //   scene.add(lineUp); 
//     // }

//     // Recursively create subdirectories and update the subLevel
//     subLevel = createDirectoryView(scene, subdirectory, subLevel - index -1, xPosition + 2);
//   });  
//   return subLevel;// + directory.subdirectories.length ;
// }

// este funciona perfecto con los cubos, no hace lineas aún
function createDirectoryView(scene: THREE.Scene, directory: any, subLevel: number, xPosition: number) {
  const geometry = new THREE.BoxGeometry(1, 1, 1);
  const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
  const cube = new THREE.Mesh(geometry, material);
  cube.position.set(xPosition, subLevel, 0);
  scene.add(cube);

  const points = [];
  points.push(new THREE.Vector3(xPosition , subLevel, 0)); // start at the left side of the subdirectory cube
  points.push(new THREE.Vector3(xPosition-2, subLevel, 0)); // go up to the bottom of the parent directory cube
 
  const lineGeometry = new THREE.BufferGeometry().setFromPoints(points);
  const lineMaterial = new THREE.LineBasicMaterial({ color: 0x0000ff });
  const line = new THREE.Line(lineGeometry, lineMaterial);
  scene.add(line);

var lastLevel = subLevel; 
  directory.subdirectories.forEach((subdirectory: any, index: any) => {
    const points = [];
    points.push(new THREE.Vector3(xPosition , subLevel-1, 0)); // go up to the bottom of the parent directory cube
    points.push(new THREE.Vector3(xPosition , lastLevel, 0)); // go left to the parent directory cube

    const lineGeometry = new THREE.BufferGeometry().setFromPoints(points);
    const lineMaterial = new THREE.LineBasicMaterial({ color: 0x0000ff });
    const line = new THREE.Line(lineGeometry, lineMaterial);
    scene.add(line);
    subLevel = createDirectoryView(scene, subdirectory, subLevel - 1, xPosition + 2);
  });
  return subLevel;
}

function App(): any {
  useEffect(() => {
    const test = new SceneInit('myThreeJsCanvas');
    test.initialize();
    test.animate();

    const folders: Directory[] = [{
      name: 'root',
      files: ['file1', 'file2'],
      subdirectories: [
        {
          name: '1-0',
          files: ['1-0.1', '1-0.2'],
          subdirectories: [
            {
              name: '1-0-0',
              files: ['1-0-0.1', '1-0-0.2'],
              subdirectories: [
                {
                  name: '1-0-0-0',
                  files: ['1-0-0-0.1',],
                  subdirectories: []
                },
                {
                  name: '1-0-0-1',
                  files: ['file8',],
                  subdirectories: [
                    {
                      name: '1-0-0-0-1-0',
                      files: ['file11',],
                      subdirectories: []
                    },
                    {
                      name: '1-0-0-0-1-1',
                      files: ['file161',],
                      subdirectories: []
                    }
                  ]
                },
                {
                  name: '1-0-0-2',
                  files: ['file9',],
                  subdirectories: []
                },
                {
                  name: '1-0-0-3',
                  files: ['file10',],
                  subdirectories: [
                    {
                      name: '1-0-0-3-0',
                      files: ['file21',],
                      subdirectories: []
                    },
                    {
                      name: '1-0-0-3-1',
                      files: ['file31',],
                      subdirectories: []
                    },
                    {
                      name: '1-0-0-3-2',
                      files: ['file41',],
                      subdirectories: []
                    }
                  ]
                }
              ]
            }
          ]
        },
        {
          name: '1-0-0-1',
          files: ['1-0-0-1.1',],
          subdirectories: []
        },

      ]
    }];
    createDirectoryView(test.scene!, folders[0], 0, 0);
  }, []);

  return (
    <div>
      <canvas id="myThreeJsCanvas" />
    </div>
  );
}

export default App;