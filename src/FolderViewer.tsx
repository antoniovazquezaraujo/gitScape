import * as THREE from 'three';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js';
import { Directory } from './NodeManager';
import SceneInit from './lib/SceneInit';

export class FolderViewer{
    private readonly directoryColor = 0x999999;

    private readonly fileColor = 0xcacc66;

    private readonly fileBorderColor = 0x999999;

    private readonly fileTextColor = 0x000000;

    private readonly folderTextColor = 0x000000;

    private readonly horizontalLineColor = 0x999999;

    private readonly verticalLineColor = 0x999999;

    public createDirectoryView(sceneInit: SceneInit, directory: Directory, subLevel: number, xPosition: number) {
        const scene = sceneInit.scene!;

        // Directory cube
        const geometry = new THREE.BoxGeometry(3, 0.4, 0.05); 
        const material = new THREE.MeshBasicMaterial({color: this.directoryColor});
        const cube = new THREE.Mesh(geometry, material);
        cube.position.set(xPosition, subLevel, 0);
        scene.add(cube);
      
        // Directory name
        const directoryTextGeometry = new TextGeometry(directory.name, {
          font: sceneInit.font!,
          size: 0.1,
          height: 0.01,
        });
      
      
        // Center directory text
        directoryTextGeometry.computeBoundingBox();
        const textWidth = directoryTextGeometry.boundingBox!.max.x - directoryTextGeometry.boundingBox!.min.x;
        const textOffset = -0.5 * textWidth;    
        const dirTextMaterial = new THREE.MeshBasicMaterial({ color: this.folderTextColor });
        const dirText = new THREE.Mesh(directoryTextGeometry, dirTextMaterial);
        dirText.position.set(xPosition, subLevel - 0.1, 0.02); 
        scene.add(dirText);
      
        // Line up to the parent directory
        const points = [];
        points.push(new THREE.Vector3(xPosition, subLevel, 0)); // start at the left side of the subdirectory cube
        points.push(new THREE.Vector3(xPosition - 2, subLevel, 0)); // go up to the bottom of the parent directory cube      
        const lineGeometry = new THREE.BufferGeometry().setFromPoints(points);
        const lineMaterial = new THREE.LineBasicMaterial({ color: this.horizontalLineColor });
        const line = new THREE.Line(lineGeometry, lineMaterial);
        scene.add(line);
      
        // Files of this directory
        directory.files.forEach((file: any, index: any) => {


            // The file cube
            const fileGeometry = new THREE.BoxGeometry(3, 0.01, 0.2); 
            const fileMaterial = new THREE.MeshBasicMaterial({ color: this.fileColor ,
                transparent: true,
                opacity:0.9

             }); 
            const fileCube = new THREE.Mesh(fileGeometry, fileMaterial);
            fileCube.position.set(xPosition, subLevel + 0.1, index * 0.2 + 0.1); 
            scene.add(fileCube);
        
            // The border of the file cube
            const edges = new THREE.EdgesGeometry(fileGeometry);
            const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: this.fileBorderColor })); 
            line.position.set(xPosition, subLevel + 0.1, index * 0.2 + 0.1);
            scene.add(line);


            // The file name text
            const fileTextGeometry = new TextGeometry(file, {
              font: sceneInit.font!,
              size: 0.1,
              height: 0.01,
            });          
            // Center the text
            fileTextGeometry.computeBoundingBox();
            const textWidth = fileTextGeometry.boundingBox!.max.x - fileTextGeometry.boundingBox!.min.x;
            const textOffset = -0.5 * textWidth;
            const fileTextMaterial = new THREE.MeshBasicMaterial({ color: this.fileTextColor }); 
            const fileText = new THREE.Mesh(fileTextGeometry, fileTextMaterial);
            fileText.position.set(xPosition + textOffset, subLevel+0.1, index * 0.2 + 0.1); 
            fileText.rotateX(Math.PI / 2); 
            scene.add(fileText);
          });
        

          // The subdirectories of this directory
        var lastLevel = subLevel;
        directory.subdirectories.forEach((subdirectory: any, index: any) => {

          // Line left   
          const points = [];
          points.push(new THREE.Vector3(xPosition, subLevel - 1, 0)); 
          points.push(new THREE.Vector3(xPosition, lastLevel, 0));       
          const lineGeometry = new THREE.BufferGeometry().setFromPoints(points);
          const lineMaterial = new THREE.LineBasicMaterial({ color: this.verticalLineColor });
          const line = new THREE.Line(lineGeometry, lineMaterial);
          scene.add(line);

          // Render the subdirectory
          subLevel = this.createDirectoryView(sceneInit, subdirectory, subLevel - 1, xPosition + 2);
        });
        return subLevel;
      }
}