import { Octokit } from '@octokit/rest';

export enum EventType {
  RepositoryChange = 'repositoryChange',
  DirectoryChange = 'directoryChange',
  CurrentCommitChange = 'currentCommitChange'
}
export interface Model {
  initialize(): void;

  // notificamos de cambio de repositorio, directorio y commit
  onChange(eventType: EventType, callback: () => void): void;
  notifyObservers(eventType: EventType): void;

  reloadDirectory(): void;
  setCommitIndex(index: number): void;
  getCommitIndex(): number;
  getCommit(index: number): any;
  getFirstCommit(): any;
  getLastCommit(): any;
  getCurrentCommit(): any;
  getCommitCount(): number;
  getCurrentCommitDate(): Date;
  getCommitFiles(ref: string): Promise<any>;
  getFileInfo(file: any): any;
  getDirectory(): Directory;
  addElement(path: string, isFile: boolean): void;
  addFileOrDirectory(commitSha: string, file: any): void;
  removeElement(path: string): void;
}

export class ModelImpl implements Model {
  private githubToken!: string;
  private octokit!: Octokit;
  private owner!: string;
  private repo!: string;
  private allCommits: any[] = [];
  private directory: Directory | undefined;
  private commitIndex: number = 0;
  private observers: { [key in EventType]?: (() => void)[] } = {};

  constructor() {
    this.observers = {};
    this.directory = new Directory('');
  }
  onChange(eventType: EventType, callback: () => void): void {
    if (!this.observers[eventType]) {
      this.observers[eventType] = [];
    }
    if (this.observers[eventType]) {
      this.observers[eventType]?.push(callback);
    }
  }

  notifyObservers(eventType: EventType): void {
    if (this.observers[eventType]) {
      for (const observer of this.observers[eventType]!) {
        observer();
      }
    }
  }

  public async initialize() {
    this.createOctokit();
    await this.reloadAllRepositoryCommits();
    this.loadInitialEmptyDirectory();
    this.setCommitIndex(0);
  }

  public loadInitialEmptyDirectory() {
    this.directory = new Directory('');
    this.notifyObservers(EventType.DirectoryChange);
  }
  public reloadDirectory() {
    this.getTreeAtCommit(this.allCommits[this.commitIndex].sha).then(treeNode => {
      this.directory = this.createDirectory(treeNode, null);
      this.notifyObservers(EventType.DirectoryChange);
    });
  }

  private createOctokit(): void {
    this.githubToken = import.meta.env.VITE_GITHUB_TOKEN;
    this.octokit = new Octokit({
      auth: this.githubToken,
    });
    this.owner = 'antoniovazquezaraujo';
    this.repo = 'letrain';
  }

  public setCommitIndex(index: number) {
    this.commitIndex = index;
    this.notifyObservers(EventType.CurrentCommitChange);
  }
  public getCommitIndex(): number {
    return this.commitIndex;
  }

  public getCommit(index: number) {
    return this.allCommits[index];
  }
  public getFirstCommit() {
    return this.allCommits[this.allCommits.length - 1];
  }
  public getLastCommit() {
    return this.allCommits[0];
  }
  public getCurrentCommit() {
    return this.allCommits[this.commitIndex];
  }
  public getCommitCount(): number {
    return this.allCommits.length;
  }
  public getCurrentCommitDate(): Date {
    return new Date(this.allCommits[this.commitIndex].commit.author.date);
  }
  public async getFileInfo(filename: string): Promise<any> {
    const files = await this.getCommitFiles(this.getCurrentCommit())
    const file = await files.find((f: any) => f.filename === filename);
    if (file) {
      return file;
    }
    return null;
  }
  // Obtiene una estructura de Directory a partir de un TreeNode
  public getDirectory(): Directory {
    return this.directory!;
  }
  public async addFileOrDirectory(commitSha: string, file: any): Promise<void> {
    const treeNode = await this.getTreeAtCommit(commitSha);
    const found = treeNode.find(file.filename);
    if (found) {
      if (found.isFile) {
        this.addElement(file.filename, true);
      } else {
        this.addElement(file.filename, false);
      }
    }
  }

  public addElement(path: string, isFile: boolean): void {
    const pathComponents = path.split('/');
    let currentDirectory = this.directory!;

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
    this.notifyObservers(EventType.DirectoryChange);
  }
  public removeElement(path: string): void {
    const parentPath = path.substring(0, path.lastIndexOf('/'));
    const elementName = path.substring(path.lastIndexOf('/') + 1);
    const directory = this.findDirectoryByPath(this.directory!, parentPath);
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
    this.notifyObservers(EventType.DirectoryChange);
  }

  ////////////////// IMPLEMENTATION /////////////////////////////////
  // obtiene todos los commits de un repositorio
  private async reloadAllRepositoryCommits(): Promise<void> {
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
    this.notifyObservers(EventType.RepositoryChange);
  }

  private async getAllCommits() {
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


  // Obtiene lof ficheros afectados por un commit
  public async getCommitFiles(ref: string): Promise<any> {
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
  find(path: string): TreeNode | null {
    const parts = path.split('/');
    let currentNode: TreeNode | null = this;
    for (const part of parts) {
      if (part in currentNode.children) {
        currentNode = currentNode.children[part];
      } else {
        return null;
      }
    }
    return currentNode;
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
