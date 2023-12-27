import * as THREE from 'three';
import { Directory } from './NodeManager';
import SceneInit from './lib/SceneInit';
import {Text} from 'troika-three-text';


export class FolderViewer{
    private readonly directoryColor = 0x999999;

    private readonly fileColor = 0xcacc66;

    private readonly fileBorderColor = 0x999999;

    private readonly fileTextColor = 0x000000;

    private readonly folderTextColor = 0x000000;

    private readonly horizontalLineColor = 0x999999;

    private readonly verticalLineColor = 0x999999;
    positions:{[path:string]:THREE.Vector3}={};

    public createDirectoryView(sceneInit: SceneInit, directory: Directory, subLevel: number, xPosition: number) {
        const scene = sceneInit.scene!;

        // Directory cube
        const geometry = new THREE.BoxGeometry(3, 0.4, 0.05); 
        const material = new THREE.MeshBasicMaterial({color: this.directoryColor});
        const cube = new THREE.Mesh(geometry, material);
        cube.position.set(xPosition, subLevel, 0);
        scene.add(cube);
        let path = directory.getPath();
        this.positions[path] = cube.position;
      
        // Directory name
        const dirText = new Text();
        dirText.text = directory.name;
        dirText.fontSize = 0.1;
        dirText.color = this.folderTextColor;
        dirText.anchorX = 'center';
        dirText.position.set(xPosition, subLevel , 0.03); 
        scene.add(dirText);
        dirText.sync();
      
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
            let path = directory.getPath()+ "/"+ file;
            this.positions[path] = fileCube.position;

            // The border of the file cube
            const edges = new THREE.EdgesGeometry(fileGeometry);
            const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: this.fileBorderColor })); 
            line.position.set(xPosition, subLevel + 0.1, index * 0.2 + 0.1);
            scene.add(line);


            // The file name text
            const fileText = new Text();
            fileText.text = file;
            fileText.fontSize = 0.1;
            fileText.color = this.fileTextColor;
            fileText.anchorX = 'center';
            fileText.position.set(xPosition, subLevel+0.09 , index * 0.2 + 0.2); 
            fileText.rotation.x = Math.PI / 2;
            scene.add(fileText);
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
          scene.add(line);

          // Render the subdirectory
          subLevel = this.createDirectoryView(sceneInit, subdirectory, subLevel - 1, xPosition + 2);
        };
        return subLevel;
      }
}