import { Octokit } from '@octokit/rest';

export enum EventType {
  RepositoryChange = 'repositoryChange',
  FolderChange = 'folderChange',
  CurrentCommitChange = 'currentCommitChange'
}
export interface Model {
  initialize(): void;

  // notificamos de cambio de repositorio, directorio y commit
  onChange(eventType: EventType, callback: () => void): void;
  notifyObservers(eventType: EventType): void;

  reloadFolder(): void;
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
  getFolder(): Folder;
  addElement(path: string, isFile: boolean): void;
  addFileOrFolder(commitSha: string, file: any): void;
  removeElement(path: string): void;
  getPullRequestForCommit(commitSha: string): any;
}

export class ModelImpl implements Model {
  private githubToken!: string;
  private octokit!: Octokit;
  private owner!: string;
  private repo!: string;
  private allCommits: any[] = [];
  // Add a property to store all pull requests
  private allPullRequests: any[];
  // Add a map to store the commits of each pull request
  private pullRequestCommits: Map<number, any[]>;
  // Add a map to link each commit to its pull request
  private commitToPullRequest: Map<string, any>;

  private folder: Folder | undefined;
  private commitIndex: number = 0;
  private observers: { [key in EventType]?: (() => void)[] } = {};

  constructor() {
    this.observers = {};
    this.folder = new Folder('');
    this.allPullRequests = [];
    this.pullRequestCommits = new Map();
    this.commitToPullRequest = new Map();
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
    await this.initializePullRequests();
    this.loadInitialEmptyFolder();
    this.setCommitIndex(0);
  }
  async initializePullRequests() {
    try {
      this.allPullRequests = await this.getAllPullRequests();

      // Get the commits of each pull request
      for (const pr of this.allPullRequests) {
        const commits = await this.octokit.paginate(this.octokit.pulls.listCommits.endpoint.merge({
          owner: this.owner,
          repo: this.repo,
          pull_number: pr.number,
          per_page: 100,
        }));

        // Store the commits in the map
        this.pullRequestCommits.set(pr.number, commits);

        // Link each commit to its pull request
        let commit: any = {};
        for (commit of commits) {
          this.commitToPullRequest.set(commit.sha, pr);
        }
      }
    } catch (error) {
      console.error(error);
    }
  }
  public getPullRequest(number: number) {
    return this.allPullRequests[number];
  }
  public getPullRequestForCommit(commitSha: string): any {
    // Get the pull request from the map
    return this.commitToPullRequest.get(commitSha);
  }
  public loadInitialEmptyFolder() {
    this.folder = new Folder('');
    this.notifyObservers(EventType.FolderChange);
  }
  public async reloadFolder() {
    const treeNode = this.commitIndex === 0 ? new TreeNode('') : await this.getTreeAtCommit(this.allCommits[this.commitIndex - 1].sha);
    this.folder = this.createFolder(treeNode, null);
    this.notifyObservers(EventType.FolderChange);
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
    return this.allCommits[0];
  }
  public getLastCommit() {
    return this.allCommits[this.allCommits.length - 1];
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
  // Obtiene una estructura de Folder a partir de un TreeNode
  public getFolder(): Folder {
    return this.folder!;
  }
  public async addFileOrFolder(commitSha: string, file: any): Promise<void> {
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
    let currentFolder = this.folder!;

    for (let i = 0; i < pathComponents.length - 1; i++) {
      const subFolderName = pathComponents[i];
      let subFolder = currentFolder.subFolders.find(d => d.name === subFolderName);
      if (!subFolder) {
        subFolder = new Folder(subFolderName, currentFolder);
        currentFolder.addSubFolder(subFolder);
      }
      currentFolder = subFolder;
    }

    const newNodeName = pathComponents[pathComponents.length - 1];
    const newNode = new TreeNode(newNodeName, isFile, {});
    if (isFile) {
      if (!currentFolder.files.find(f => f === newNode.name)) {
        currentFolder.addFile(newNode.name);
      }
    } else {
      if (!currentFolder.subFolders.find(d => d.name === newNode.name)) {
        const newSubFolder = this.createFolder(newNode, currentFolder);
        currentFolder.addSubFolder(newSubFolder);
      }
    }
    this.notifyObservers(EventType.FolderChange);
  }
  public removeElement(path: string): void {
    const parentPath = path.substring(0, path.lastIndexOf('/'));
    const elementName = path.substring(path.lastIndexOf('/') + 1);
    const folder = this.findFolderByPath(this.folder!, parentPath);
    if (folder) {
      let index = folder.files.indexOf(elementName);
      if (index !== -1) {
        folder.removeFile(elementName);
      } else {
        for (let i = 0; i < folder.subFolders.length; i++) {
          if (folder.subFolders[i].name === elementName) {
            folder.removeSubFolder(folder.subFolders[i]);
            break;
          }
        }
      }
    }
    this.notifyObservers(EventType.FolderChange);
  }

  ////////////////// IMPLEMENTATION /////////////////////////////////
  // obtiene todos los commits de un repositorio
  private async reloadAllRepositoryCommits(): Promise<void> {
    const perPage = 10; // Máximo permitido por la API de GitHub
    let page = 0;
    this.allCommits = [];

    while (true) {
      const { data: commits } = await this.octokit.repos.listCommits({
        owner: this.owner,
        repo: this.repo,
        per_page: perPage,
        page: page,
        sha: 'develop'
      });

      this.allCommits = this.allCommits.concat(commits);
      if (commits.length < perPage) {
        break;
      }
      page++;
    }
    this.allCommits.reverse();
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
  // Crea una estructura de Folder a partir de un TreeNode de forma recursiva
  private createFolder(node: TreeNode, parent: Folder | null = null): Folder {
    const folder = new Folder(node.name, parent);

    for (let key in node.children) {
      const childNode = node.children[key];
      if (childNode.isFile) {
        folder.addFile(childNode.name);
      } else {
        const subFolder = this.createFolder(childNode, folder);
        folder.addSubFolder(subFolder);
      }
    }
    return folder;
  }

  private findFolderByPath(root: Folder, path: string): Folder | null {
    const parts = path.split('/');
    let currentFolder = root;
    for (let part of parts) {
      let found = false;
      for (let subFolder of currentFolder.subFolders) {
        if (subFolder.name === part) {
          currentFolder = subFolder;
          found = true;
          break;
        }
      }
      if (!found) {
        return null;
      }
    }
    return currentFolder;
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

  async getAllPullRequests() {
    const options = this.octokit.pulls.list.endpoint.merge({
      owner: this.owner,
      repo: this.repo,
      state: 'all',
      per_page: 100, // maximum amount of results per page
    });
    return await this.octokit.paginate(options);
  }

  public async getCommitsFromUrl(url: string) {
    try {
      const { data: commits } = await this.octokit.request('GET ' + url);
      return commits;
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

export class Folder {
  name: string;
  parent: Folder | null;
  subFolders: Folder[];
  files: string[];

  constructor(name: string, parent: Folder | null = null) {
    this.name = name;
    this.parent = parent;
    this.subFolders = [];
    this.files = [];
  }
  public getNumSubFolders(): number {
    let total = 1;
    for (let subFolder of this.subFolders) {
      total += subFolder.getNumSubFolders();
    }
    return total;
  }
  public getNumFiles(){
    return this.files.length;
  }
  public getParent(){
    return this.parent;
  }

  addFile(file: any) {
    this.files.push(file);
  }

  removeFile(file: string) {
    this.files.splice(this.files.indexOf(file), 1);
  }

  addSubFolder(subFolder: Folder) {
    this.subFolders.push(subFolder);
  }
  removeSubFolderByName(name: string) {
    const subFolder = this.subFolders.find(d => d.name === name);
    if (subFolder) {
      this.subFolders.splice(this.subFolders.indexOf(subFolder), 1);
    }
  }
  removeSubFolder(subFolder: Folder) {
    this.subFolders.splice(this.subFolders.indexOf(subFolder), 1);
  }
  getPath(): string {
    if (this.parent === null || this.parent.name === '') {
      return this.name;
    } else {
      return `${this.parent.getPath()}/${this.name}`;
    }
  }
}