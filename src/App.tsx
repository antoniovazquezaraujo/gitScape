import React, { useEffect } from 'react';
import { FolderViewer } from './FolderViewer';
import LogManager from './LogManager';
import { Directory, TreeNode, TreeNodeManager } from './NodeManager';
import SceneInit from './lib/SceneInit';


function printTree(node: TreeNode, prefix: number): void {

  prefix++
  if (!node.isFile) {
    console.log('  '.repeat(prefix) + "[" + node.name + "]");
  } else {
    console.log('  '.repeat(prefix) + node.name);
  }
  for (const child in node.children) {
    printTree(node.children[child], prefix);
  }
}

export async function showData() {
  const logManager = new LogManager();

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
            commitInfo = commitInfo + file.filename + "(["+ file.status +"] +:"+ file.additions + " -:"+ file.deletions + " x:"+ file.changes + ")"+ "\n";
          });
          console.log("\n" + commitInfo + "\n");
        });
      });
    });
  });
}

function App(): any {
  useEffect(() => {
    showData();
    const sceneInit = new SceneInit('myThreeJsCanvas');
    sceneInit.initialize().then(() => {
      sceneInit.animate();

      const logManager = new LogManager();
      logManager.getTree('7cd7dd736c253073b4a0f9cc0895d1e37ac398ca').then(root => {

        var treeNodeManager: TreeNodeManager = new TreeNodeManager();
        const directory: Directory = treeNodeManager.convertTreeNodeToDirectory(root);
        const folderViewer:FolderViewer = new FolderViewer();
        folderViewer.createDirectoryView(sceneInit, directory, 0, 0);
        console.log(folderViewer.positions);
      });
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