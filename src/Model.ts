import { Octokit } from '@octokit/rest';

export class Model {

  githubToken: string;
  octokit: Octokit;
  owner: string;
  repo: string;
  allCommits: any[] = [];
  directory: Directory | undefined;
  commitIndex: number = 0;

  public constructor() {
    this.githubToken = import.meta.env.VITE_GITHUB_TOKEN;
    this.octokit = new Octokit({
      auth: this.githubToken,
    });
    this.owner = 'antoniovazquezaraujo';
    this.repo = 'LeTrain';
  }

  public async initialize() {
    return this.reloadAllCommits();
  }

  // obtiene todos los commits de un repositorio, si ya se han obtenido previamente, los devuelve
  public async getAllCommits() {
    if (this.allCommits == undefined) {
      await this.reloadAllCommits();
    }
    return this.allCommits;
  }
  public reloadDirectory() {
    this.getTreeAtCommit(this.allCommits[this.commitIndex].sha).then(treeNode => {
      this.directory = this.createDirectory(treeNode, null);;
    });
  }
  // Obtiene una estructura de Directory a partir de un TreeNode
  public getDirectory(): Directory | undefined {
    if (this.directory == undefined) {
      this.reloadDirectory();
    }
    return this.directory;
  }
  public setCommitIndex(commitIndex: number) {
    this.commitIndex = commitIndex;
  }
  public getCurrentCommit() {
    return this.allCommits[this.commitIndex];
  }
  ///////////////////////////////////////////////////

  // obtiene todos los commits de un repositorio
  private async reloadAllCommits(): Promise<any[]> {
    const perPage = 100; // Máximo permitido por la API de GitHub
    let page = 1;
    this.allCommits = [];

    while (true) {
      const { data: commits } = await this.octokit.repos.listCommits({
        owner: this.owner,
        repo: this.repo,
        per_page: perPage,
        page: page,
      });

      this.allCommits = this.allCommits.concat(commits);
      if (commits.length < perPage) {
        break;
      }
      page++;
    }
    return this.allCommits;
  }

  // Obtiene un TreeNode a partir de un commit
  private async getTreeAtCommit(ref: string): Promise<TreeNode> {
    const root = new TreeNode('');
    const { data } = await this.octokit.git.getTree({
      owner: this.owner,
      repo: this.repo,
      tree_sha: ref,
      recursive: '1',
    });

    data.tree.forEach((item: any) => {
      let currentNode = root;
      const pathParts = item.path.split('/');
      pathParts.forEach((part: string, index: number) => {
        if (!currentNode.children[part]) {
          currentNode.children[part] = new TreeNode(part);
        }
        currentNode = currentNode.children[part];
        if (index === pathParts.length - 1 && item.type === 'blob') {
          currentNode.isFile = true;
        }
      });
    });

    return root;
  }
  // Crea una estructura de Directory a partir de un TreeNode de forma recursiva
  private createDirectory(node: TreeNode, parent: Directory | null = null): Directory {
    const directory = new Directory(node.name, parent);

    for (let key in node.children) {
      const childNode = node.children[key];
      if (childNode.isFile) {
        directory.files.push(childNode.name);
      } else {
        const subdirectory = this.createDirectory(childNode, directory);
        directory.subdirectories.push(subdirectory);
      }
    }
    return directory;
  }

  public addElementToDirectory(root: Directory, path: string, element: TreeNode): void {
    const directory = this.findDirectoryByPath(root, path);
    if (directory) {
      if (element.isFile) {
        directory.files.push(element.name);
      } else {
        const subdirectory = this.createDirectory(element, directory);
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
        const newSubdirectory = this.createDirectory(newNode, currentDirectory);
        currentDirectory.subdirectories.push(newSubdirectory);
      }
    }

    return directory;
  }




  // // obtiene el primer commit de un repositorio
  // getFirstCommit(): any {
  //   return this.allCommits[this.allCommits.length - 1];
  // }

  // // obtiene el último commit de un repositorio
  // getLastCommit(): any {
  //   return this.allCommits[0];
  // }

  public findPathInTreeNode(path: string, treeNode: TreeNode): TreeNode | null {
    console.log(path);
    const parts = path.split('/');
    console.log(parts);
    let currentNode = treeNode;
    for (const part of parts) {
      if (part in currentNode.children) {
        currentNode = currentNode.children[part];
      } else {
        return null;
      }
    }
    return currentNode;
  }





  // Obtiene lof ficheros afectados por un commit
  public async getCommitFiles(ref: string) {
    try {
      const commit = await this.octokit.repos.getCommit({
        owner: this.owner,
        repo: this.repo,
        ref,
      });
      return commit.data.files;
    } catch (error) {
      console.error(error);
    }
  }

  // Obtiene los pull requests asociados a un commit
  public async getCommitPullRequests(commit_sha: string) {
    try {
      const commit = await this.octokit.repos.listPullRequestsAssociatedWithCommit({
        owner: this.owner,
        repo: this.repo,
        commit_sha
      });
      return commit.data;
    } catch (error) {
      console.error(error);
    }
  }


  public async showData() {
    this.getAllCommits().then(commit => {
      commit.forEach(element => {
        var commitInfo: string = "\n------------------COMMIT-------------------------\n";
        commitInfo = commitInfo + "Author: " + element.author?.login + "\n";
        commitInfo = commitInfo + "\nMessage:" + element.commit.message.split("\n")[0] + "\n";
        this.getCommitPullRequests(element.sha).then(allPullRequests => {
          commitInfo = commitInfo + "\nPull requests:\n";
          allPullRequests?.forEach(x => {
            commitInfo = commitInfo + (x.title + "\n");
            commitInfo = commitInfo + ("Date: " + x.merged_at + "\n");
          });
          this.getCommitFiles(element.sha).then(allFiles => {
            commitInfo = commitInfo + "\nFiles:\n";
            allFiles?.forEach(file => {
              commitInfo = commitInfo + file.filename + "([" + file.status + "] +:" + file.additions + " -:" + file.deletions + " x:" + file.changes + ")" + "\n";
            });
            console.log("\n" + commitInfo + "\n");
          });
        });
      });
    });
  }
}

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
