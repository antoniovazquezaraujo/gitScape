import { useEffect } from 'react';
import * as THREE from 'three';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js';
import SceneInit from './lib/SceneInit';
import React from 'react';
import LogManager from './LogManager'
import { TreeNodeManager, TreeNode } from './NodeManager'


interface Directory {
  name: string;
  files: string[];
  subdirectories: Directory[];
}

function createDirectoryView(sceneInit: SceneInit, directory: Directory, subLevel: number, xPosition: number) {
  const scene = sceneInit.scene!;
  const geometry = new THREE.BoxGeometry(2, 0.4, 0.2); // make the cube wider and flatter
  const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
  const cube = new THREE.Mesh(geometry, material);
  cube.position.set(xPosition, subLevel, 0);
  scene.add(cube);

  // Add directory name to the cube
  const textGeometry = new TextGeometry(directory.name, {
    font: sceneInit.font!,
    size: 0.1,
    height: 0.01,
  });

  directory.files.forEach((file: any, index: any) => {
    const fileGeometry = new THREE.BoxGeometry(2, 0.2, 0.2); // make the cube wider and flatter
    const fileMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 }); // red color for files
    const fileCube = new THREE.Mesh(fileGeometry, fileMaterial);
    fileCube.position.set(xPosition, subLevel + 0.1, index * 0.2 + 0.2); // stack the file cubes in the z direction on top of the directory cube
    scene.add(fileCube);

    const edges = new THREE.EdgesGeometry(fileGeometry);
    const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0x000000 })); // red color for edges
    line.position.set(xPosition, subLevel + 0.1, index * 0.2 + 0.2);
    scene.add(line);
    // Center the text
    textGeometry.computeBoundingBox();
    const textWidth = textGeometry.boundingBox!.max.x - textGeometry.boundingBox!.min.x;
    const textOffset = -0.5 * textWidth;

    const fileTextMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff }); // white color for file names
    const fileText = new THREE.Mesh(textGeometry, fileTextMaterial);
    fileText.position.set(xPosition + textOffset, subLevel, index * 0.2 + 0.15); // position the text on the front face of the file cube
    fileText.rotateX(Math.PI / 2); // rotate the text 90 degrees around the x-axis
    scene.add(fileText);
  });

  // Center the text
  textGeometry.computeBoundingBox();
  const textWidth = textGeometry.boundingBox!.max.x - textGeometry.boundingBox!.min.x;
  const textOffset = -0.5 * textWidth;

  const dirTextMaterial = new THREE.MeshBasicMaterial({ color: 0x0000ff });
  const dirText = new THREE.Mesh(textGeometry, dirTextMaterial);
  dirText.position.set(xPosition, subLevel - 0.2, 0.1); // position the directory text a bit forward in the z direction
  scene.add(dirText);

  const points = [];
  points.push(new THREE.Vector3(xPosition, subLevel, 0)); // start at the left side of the subdirectory cube
  points.push(new THREE.Vector3(xPosition - 2, subLevel, 0)); // go up to the bottom of the parent directory cube

  const lineGeometry = new THREE.BufferGeometry().setFromPoints(points);
  const lineMaterial = new THREE.LineBasicMaterial({ color: 0x0000ff });
  const line = new THREE.Line(lineGeometry, lineMaterial);
  scene.add(line);


  var lastLevel = subLevel;
  directory.subdirectories.forEach((subdirectory: any, index: any) => {
    const points = [];
    points.push(new THREE.Vector3(xPosition, subLevel - 1, 0)); // go up to the bottom of the parent directory cube
    points.push(new THREE.Vector3(xPosition, lastLevel, 0)); // go left to the parent directory cube

    const lineGeometry = new THREE.BufferGeometry().setFromPoints(points);
    const lineMaterial = new THREE.LineBasicMaterial({ color: 0x0000ff });
    const line = new THREE.Line(lineGeometry, lineMaterial);
    scene.add(line);
    subLevel = createDirectoryView(sceneInit, subdirectory, subLevel - 1, xPosition + 2);
  });
  return subLevel;
}

function printTree(node: TreeNode, prefix:number): void {
  
  prefix++
  if(!node.isFile){
    console.log('  '.repeat(prefix)+"["+node.name+"]");
  }else{
    console.log('  '.repeat(prefix)+node.name);
  }
  for (const child in node.children) {
    printTree(node.children[child], prefix );
  }
}

export async function showData() {
  const logManager = new LogManager();
  
  logManager.getTreeFromOctokit('7cd7dd736c253073b4a0f9cc0895d1e37ac398ca').then(root => {
    printTree(root, 0);
  });
 
  logManager.getCommits().then(commit => {
    commit.data.forEach(element => {
      var commitInfo: string = "\n------------------COMMIT-------------------------\n";
      commitInfo = commitInfo + "Author: " + element.author?.login + "\n";
      commitInfo = commitInfo + "\nMessage:" + element.commit.message.split("\n")[0] + "\n";
      logManager.getCommitPullRequests(element.sha).then(allPullRequests => {
        commitInfo = commitInfo + "\nPull requests:\n";
        allPullRequests?.forEach(x => {
          commitInfo = commitInfo + (x.title + "\n");
          commitInfo = commitInfo + ("Date: " + x.merged_at + "\n");
        });
        logManager.getCommitFiles(element.sha).then(allFiles => {
          commitInfo = commitInfo + "\nFiles:\n";
          allFiles?.forEach(file => {
            commitInfo = commitInfo + file.filename + "\n";
          });
          // console.log("\n" + commitInfo + "\n");
        });
      });
    });
  });
}

function App(): any {
  useEffect(() => {

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
                      files: [
                        'file21', 'file21', 'file21', 'file21',
                        'file21', 'file21', 'file21', 'file21',
                        'file21', 'file21', 'file21'
                      ],
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
          name: '1-1',
          files: ['1-0-0-1.1',],
          subdirectories: []
        },

      ]
    }];
    showData();
    const sceneInit = new SceneInit('myThreeJsCanvas');
    sceneInit.initialize().then(() => {
      sceneInit.animate();
      createDirectoryView(sceneInit, folders[0], 0, 0);
    }
    );
  }, []);

  return (
    <div>
      <canvas id="myThreeJsCanvas" />
    </div>
  );
}

export default App;