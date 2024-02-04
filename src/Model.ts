// import { Octokit } from '@octokit/rest';
import { GitModel, GitModelImpl } from './GitModel';
import { EventType, TreeNode, TreeNodeImpl } from './TreeNodeModel';


export interface Model {
  initialize(): void;
  onChange(eventType: EventType, callback: () => void): void;
  notifyObservers(eventType: EventType): void;
  reload(): void;
  getNode(): TreeNodeImpl;
  addElement(path: string, isFile: boolean): void;
  addTreeNode(commitSha: string, file: any): void;
  removeElement(path: string): void;
  setCommitIndex(index: number): void;
  getCommitIndex(): number;
  getCommitCount(): number;
  getCurrentCommit(): any;
  getPullRequestForCommit(commit_sha: string): any;
  getCommitFiles(ref: string): Promise<any>;
  find(path: string): TreeNode | null;
  findFirstVisibleParent(path: string): TreeNode;
}


export class ModelImpl implements Model {
  gitModel: GitModel;
  treeNode: TreeNode;

  observers: { [key in EventType]?: (() => void)[] } = {};

  constructor() {
    this.observers = {};
    this.treeNode = new TreeNodeImpl('');
    this.gitModel = new GitModelImpl();
  }
  find(path: string): TreeNode | null {
    return this.treeNode.find(path);
  }
  findFirstVisibleParent(path: string): TreeNode {
    return this.treeNode.findFirstVisibleParent(path);
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
    this.treeNode = new TreeNodeImpl('');
    this.notifyObservers(EventType.TreeNodeChange);
  }
  public async reload() {
    // if (this.gitModel.getCommitIndex() === 0) {
    //   this.treeNode = new TreeNodeImpl('');
    // } else {
    const previousCommit = this.gitModel.getPreviousCommit();
    if (previousCommit != null) {
      const data = await this.gitModel.getTreeAtCommit(previousCommit.sha);
      this.treeNode = this.createTreeNodeFromCommit(data);
      this.notifyObservers(EventType.TreeNodeChange);
    }
    // }
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

  public getNode(): TreeNodeImpl {
    return this.treeNode!;
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
    let currentRootNode = this.treeNode!;

    for (let i = 0; i < pathComponents.length - 1; i++) {
      const pathComponent = pathComponents[i];
      let treeNode = currentRootNode.children[pathComponent];
      if (!treeNode) {
        treeNode = new TreeNodeImpl(pathComponent, false, currentRootNode);
        currentRootNode.addTreeNode(treeNode);
      }
      currentRootNode = treeNode;
    }

    const newNodeName = pathComponents[pathComponents.length - 1];
    const newNode = new TreeNodeImpl(newNodeName, isFile, currentRootNode, {});
    if (!currentRootNode.children[newNodeName]) {
      currentRootNode.addTreeNode(newNode);
      this.notifyObservers(EventType.TreeNodeChange);
    }
  }
  public removeElement(path: string): void {
    const parentPath = path.substring(0, path.lastIndexOf('/'));
    const elementName = path.substring(path.lastIndexOf('/') + 1);
    const node = this.findTreeNodeByPath(this.treeNode!, parentPath);
    if (node) {
      if (node.children[elementName]) {
        node.removeTreeNode(node.children[elementName]);
      }
    }
    this.notifyObservers(EventType.TreeNodeChange);
  }

  private createTreeNodeFromCommit(data: any) {
    const root = new TreeNodeImpl('');
    data.tree.forEach((item: any) => {
      let currentNode = root;
      const pathParts = item.path.split('/');
      pathParts.forEach((part: string, index: number) => {
        if (!currentNode.children[part]) {
          currentNode.children[part] = new TreeNodeImpl(part);
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

  findTreeNodeByPath(root: TreeNodeImpl, path: string): TreeNodeImpl | null {
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


