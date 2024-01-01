import GitModel from "./GitModel";

export class TreeNode {
  name: string;
  children: { [key: string]: TreeNode; };
  isFile: boolean;

  constructor(name: string, isFile: boolean = false, children: { [key: string]: TreeNode; } = {}) {
    this.name = name;
    this.children = children;
    this.isFile = isFile;
  }
}

export class Directory {
  name: string;
  parent: Directory | null;
  subdirectories: Directory[];
  files: string[];

  constructor(name: string, parent: Directory | null = null) {
    this.name = name;
    this.parent = parent;
    this.subdirectories = [];
    this.files = [];
  }

  getPath(): string {
    if (this.parent === null || this.parent.name === '') {
      return this.name;
    } else {
      return `${this.parent.getPath()}/${this.name}`;
    }
  }
}

export class GitScapeModel {
  gitModel: GitModel;

  public constructor(gitModel: GitModel) {
    this.gitModel = gitModel;
  }
  
  public printTree(node: TreeNode, prefix: number): void {
    prefix++
    if (!node.isFile) {
      console.log('  '.repeat(prefix) + "[" + node.name + "]");
    } else {
      console.log('  '.repeat(prefix) + node.name);
    }
    for (const child in node.children) {
      this.printTree(node.children[child], prefix);
    }
  }

  public addElementToDirectory(root: Directory, path: string, element: TreeNode): void {
    const directory = this.findDirectoryByPath(root, path);
    if (directory) {
      if (element.isFile) {
        directory.files.push(element.name);
      } else {
        const subdirectory = this.gitModel.createDirectory(element, directory);
        directory.subdirectories.push(subdirectory);
      }
    }
  }

  public removeElementFromDirectory(root: Directory, path: string): void {
    const parentPath = path.substring(0, path.lastIndexOf('/'));
    const elementName = path.substring(path.lastIndexOf('/') + 1);
    const directory = this.findDirectoryByPath(root, parentPath);
    if (directory) {
      let index = directory.files.indexOf(elementName);
      if (index !== -1) {
        directory.files.splice(index, 1);
      } else {
        for (let i = 0; i < directory.subdirectories.length; i++) {
          if (directory.subdirectories[i].name === elementName) {
            directory.subdirectories.splice(i, 1);
            break;
          }
        }
      }
    }
  }

  private findDirectoryByPath(root: Directory, path: string): Directory | null {
    const parts = path.split('/');
    let currentDirectory = root;
    for (let part of parts) {
      let found = false;
      for (let subdirectory of currentDirectory.subdirectories) {
        if (subdirectory.name === part) {
          currentDirectory = subdirectory;
          found = true;
          break;
        }
      }
      if (!found) {
        return null;
      }
    }
    return currentDirectory;
  }

  public addPathToDirectory(directory: Directory, path: string, isFile: boolean): Directory {
    const pathComponents = path.split('/');
    let currentDirectory = directory;

    for (let i = 0; i < pathComponents.length - 1; i++) {
      const subdirectoryName = pathComponents[i];
      let subdirectory = currentDirectory.subdirectories.find(d => d.name === subdirectoryName);
      if (!subdirectory) {
        subdirectory = new Directory(subdirectoryName, currentDirectory);
        currentDirectory.subdirectories.push(subdirectory);
      }
      currentDirectory = subdirectory;
    }

    const newNodeName = pathComponents[pathComponents.length - 1];
    const newNode = new TreeNode(newNodeName, isFile, {});
    if (isFile) {
      if (!currentDirectory.files.find(f => f === newNode.name)) {
        currentDirectory.files.push(newNode.name);
      }
    } else {
      if (!currentDirectory.subdirectories.find(d => d.name === newNode.name)) {
        const newSubdirectory = this.gitModel.createDirectory(newNode, currentDirectory);
        currentDirectory.subdirectories.push(newSubdirectory);
      }
    }

    return directory;
  }
}