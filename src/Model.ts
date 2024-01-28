// import { Octokit } from '@octokit/rest';
import { GitModel, GitModelImpl } from './GitModel';

export enum EventType {
  RepositoryChange = 'repositoryChange',
  TreeNodeChange = 'treeNodeChange',
  CurrentCommitChange = 'currentCommitChange'
}
export interface Model {
  initialize(): void;
  onChange(eventType: EventType, callback: () => void): void;
  notifyObservers(eventType: EventType): void;
  reload(): void;
  getNode(): TreeNode;
  addElement(path: string, isFile: boolean): void;
  addTreeNode(commitSha: string, file: any): void;
  removeElement(path: string): void;
  setCommitIndex(index: number): void;
  getCommitIndex(): number;
  getCommitCount(): number;
  getCurrentCommit(): any;
  getPullRequestForCommit(commit_sha: string): any;
  getCommitFiles(ref: string): Promise<any>;
}


export class ModelImpl implements Model {
  gitModel: GitModel;

  private root: TreeNode | undefined;
  private observers: { [key in EventType]?: (() => void)[] } = {};

  constructor() {
    this.observers = {};
    this.root = new TreeNode('');
    this.gitModel = new GitModelImpl();
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
    this.gitModel.initialize();
    this.loadInitialEmptyTreeNode();
  }
  public loadInitialEmptyTreeNode() {
    this.root = new TreeNode('');
    this.notifyObservers(EventType.TreeNodeChange);
  }
  public async reload() {
    if (this.gitModel.getCommitIndex() === 0) {
      this.root = new TreeNode('');
    } else {
      const data = await this.gitModel.getTreeAtCommit(this.gitModel.getPreviousCommit().sha);
      this.root = this.createTreeNodeFromCommit(data);
    }
    this.notifyObservers(EventType.TreeNodeChange);
  }

  public setCommitIndex(index: number) {
    this.gitModel.setCommitIndex(index);
    this.notifyObservers(EventType.CurrentCommitChange);
  }
  public getCommitIndex(): number {
    return this.gitModel.getCommitIndex();
  }
  public getCommitCount(): number {
    return this.gitModel.getCommitCount();
  }
  public async getFileInfo(filename: string): Promise<any> {
    const files = await this.getCommitFiles(this.gitModel.getCurrentCommit())
    const file = await files.find((f: any) => f.filename === filename);
    if (file) {
      return file;
    }
    return null;
  }

  public getNode(): TreeNode {
    return this.root!;
  }
  public async addTreeNode(commitSha: string, file: any): Promise<void> {
    const data = await this.gitModel.getTreeAtCommit(commitSha);
    const treeNode = this.createTreeNodeFromCommit(data);
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
    let currentRootNode = this.root!;

    for (let i = 0; i < pathComponents.length - 1; i++) {
      const pathComponent = pathComponents[i];
      let treeNode = currentRootNode.children[pathComponent];
      if (!treeNode) {
        treeNode = new TreeNode(pathComponent, false, currentRootNode);
        currentRootNode.addTreeNode(treeNode);
      }
      currentRootNode = treeNode;
    }

    const newNodeName = pathComponents[pathComponents.length - 1];
    const newNode = new TreeNode(newNodeName, isFile, currentRootNode, {});
    if (!currentRootNode.children[newNodeName]) {
      currentRootNode.addTreeNode(newNode);
      this.notifyObservers(EventType.TreeNodeChange);
    }
  }
  public removeElement(path: string): void {
    const parentPath = path.substring(0, path.lastIndexOf('/'));
    const elementName = path.substring(path.lastIndexOf('/') + 1);
    const node = this.findTreeNodeByPath(this.root!, parentPath);
    if (node) {
      if (node.children[elementName]) {
        node.removeTreeNode(node.children[elementName]);
      }
    }
    this.notifyObservers(EventType.TreeNodeChange);
  }

  private createTreeNodeFromCommit(data: any) {
    const root = new TreeNode('');
    data.tree.forEach((item: any) => {
      let currentNode = root;
      const pathParts = item.path.split('/');
      pathParts.forEach((part: string, index: number) => {
        if (!currentNode.children[part]) {
          currentNode.children[part] = new TreeNode(part);
          currentNode.children[part].parent = currentNode;
        }
        currentNode = currentNode.children[part];
        if (index === pathParts.length - 1 && item.type === 'blob') {
          currentNode.isFile = true;
        }
      });
    });
    return root;
  }

  findTreeNodeByPath(root: TreeNode, path: string): TreeNode | null {
    const parts = path.split('/');
    let currentRootNode = root;
    let found = false;
    for (let part of parts) {
      found = false;
      if (currentRootNode.children[part]) {
        currentRootNode = currentRootNode.children[part];
        found = true;
        break;
      }
    }
    if (!found) {
      return null;
    }
    return currentRootNode;
  }


  // Obtiene lof ficheros afectados por un commit
  public async getCommitFiles(ref: string): Promise<any> {
    return this.gitModel.getCommitFiles(ref);
  }

  // Obtiene los pull requests asociados a un commit
  public async getCommitPullRequests(commit_sha: string) {
    return this.gitModel.getCommitPullRequests(commit_sha);
  }

  async getAllPullRequests() {
    return this.gitModel.getAllPullRequests();
  }

  public async getCommitsFromUrl(url: string) {
    return this.gitModel.getCommitsFromUrl(url);
  }
  public getCurrentCommit(): any {
    return this.gitModel.getCurrentCommit();
  }
  public getPullRequestForCommit(commit_sha: string): any {
    return this.gitModel.getPullRequestForCommit(commit_sha);
  }
}


export class TreeNode {
  name: string;
  parent: TreeNode | null;
  children: { [key: string]: TreeNode; };
  isFile: boolean;
  visible: boolean;

  constructor(name: string, isFile: boolean = false, parent: TreeNode | null = null, children: { [key: string]: TreeNode; } = {}) {
    this.name = name;
    this.parent = parent;
    this.children = children;
    this.isFile = isFile;
    this.visible = !this.isFile; // Los archivos estarán cerrados por defecto
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
  findOpen(path: string): TreeNode | null {
    const parts = path.split('/');
    let currentNode: TreeNode | null = this;
    for (const part of parts) {
      let lastOpenNode = currentNode;
      if (part in currentNode.children) {
        if (currentNode.visible) {
          currentNode = currentNode.children[part];
          lastOpenNode = currentNode;
        } else {
          return lastOpenNode;
        }
      } else {
        return null;
      }
    }
    return currentNode;
  }

  getNumVisibleNodes(): number {
    if (!this.visible) {
      return 1
    };
    let total = 1;
    for (let child of Object.values(this.children)) {
      if (!child.isFile) {
        total += child.getNumVisibleNodes();
      }
    }
    return total;
  }


  public getParent() {
    return this.parent;
  }
  addTreeNode(treeNode: TreeNode) {
    this.children[treeNode.name] = treeNode;
    treeNode.parent = this;
  }
  removeTreeNode(treeNode: TreeNode) {
    treeNode.parent = null;
    delete this.children[treeNode.name];
  }

  getPath(): string {
    if (this.parent === null || this.parent.name === '') {
      return this.name;
    } else {
      return `${this.parent.getPath()}/${this.name}`;
    }
  }
  removeByName(name: string) {
    const treeNode = this.children[name];
    if (treeNode) {
      this.removeTreeNode(treeNode);
    }
  }
}

