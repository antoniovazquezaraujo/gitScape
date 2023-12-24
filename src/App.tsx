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
function createDirectoryView(scene: THREE.Scene, directory: Directory, level: number, xPosition:number): void {
  const loader = new FontLoader();
  loader.load(
    'node_modules/three/examples/fonts/droid/droid_serif_regular.typeface.json',
    (font) => {
      // Create a cube for the directory
      const dirGeometry = new THREE.BoxGeometry(1, 1, 1);
      const dirMaterial = new THREE.MeshBasicMaterial({color: 0xff0000});
      const dirCube = new THREE.Mesh(dirGeometry, dirMaterial);
      dirCube.position.set(xPosition, 0,level*1.4);
      scene.add(dirCube);

      // Create a cube for each file in the directory
      var verticalPosition = 1;
      directory.files.forEach((file, index) => {
        const fileGeometry = new THREE.BoxGeometry(1, 0.5, 0.1);
        const fileMaterial = new THREE.MeshBasicMaterial({color: 0x00ff00});
        const fileCube = new THREE.Mesh(fileGeometry, fileMaterial);
        fileCube.position.set(xPosition + index / 10, verticalPosition, level*1.4);
        scene.add(fileCube);

        const textGeometry = new TextGeometry(file, {
          font: font,
          size: 0.1,
          height: 0.01,
        });
        const textMaterial = new THREE.MeshBasicMaterial({color: 0xff00ff});
        const text = new THREE.Mesh(textGeometry, textMaterial);
        text.position.set(xPosition+ index/10 , verticalPosition, level*1.4+0.2);
        scene.add(text);
        verticalPosition += 0.5;
      });

      // Create a line to each subdirectory
      var directoryPosition = xPosition ;
      directory.subdirectories.forEach((subdirectory, index) => {
        const lineMaterial = new THREE.LineBasicMaterial({color: 0xffffff});
        const points = [];
        points.push(
          new THREE.Vector3(0, level, 1), // start at the back of the directory cube
          new THREE.Vector3(index * 2, level + 1, -1) // end at the front of the subdirectory cube
        );

        const lineGeometry = new THREE.BufferGeometry().setFromPoints(points);
        const line = new THREE.Line(lineGeometry, lineMaterial);
        // scene.add(line);
        createDirectoryView(scene, subdirectory, level - 1, directoryPosition);
        directoryPosition += 2;
      });
    }
  );
}

function App() :any{
  useEffect(() => {
    const test = new SceneInit('myThreeJsCanvas');
    test.initialize();
    test.animate();

    const folders: Directory[] = [{
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
                },
                {
                  name: 'sub4',
                  files: ['file8',],
                  subdirectories: [
                    {
                      name: 'sub7',
                      files: ['file11',],
                      subdirectories: []
                    }
                  ]
                },
                {
                  name: 'sub5',
                  files: ['file9',],
                  subdirectories: []
                },
                {
                  name: 'sub6',
                  files: ['file10',],
                  subdirectories: [
                    {
                      name: 'sub17',
                      files: ['file21',],
                      subdirectories: []
                    },
                    {
                      name: 'sub27',
                      files: ['file31',],
                      subdirectories: []
                    },
                    {
                      name: 'sub37',
                      files: ['file41',],
                      subdirectories: []
                    }
                  ]
                }
              ]
            }
          ]
        }
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